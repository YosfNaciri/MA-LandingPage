import { readIntakePages } from "../lib/adminIntake";
import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../Components/AdminLayout";
import {
  getSupabaseClient,
  intakeDocumentsTable,
  intakeFilesBucket,
  intakeTable,
} from "../lib/supabaseClient";

const STATUS_OPTIONS = [
  "Nouveau",
  "En révision",
  "Documents manquants",
  "En traitement",
  "Complété",
  "Archivé",
];

const STATUS_BADGE_CLASSES = {
  Nouveau: "border-sky-200 bg-sky-50 text-sky-700",
  "En révision": "border-indigo-200 bg-indigo-50 text-indigo-700",
  "Documents manquants": "border-amber-200 bg-amber-50 text-amber-700",
  "En traitement": "border-violet-200 bg-violet-50 text-violet-700",
  Complété: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Archivé: "border-slate-200 bg-slate-50 text-slate-600",
  Reçu: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

const DEFAULT_STATUS_BADGE_CLASS =
  "border-ma-separator/60 bg-ma-bg text-ma-muted";

const TYPE_CLIENT_LABELS = {
  particulier: "Particulier",
  travailleur_autonome: "Travailleur autonome",
  societe: "Société par actions",
  osbl: "OSBL / organisme",
  succession: "Succession",
};

const LANGUE_LABELS = {
  fr: "Français",
  en: "Anglais",
};

const ETAT_CIVIL_LABELS = {
  celibataire: "Célibataire",
  marie: "Marié(e)",
  conjoint_fait: "Conjoint(e) de fait",
  separe: "Séparé(e)",
  divorce: "Divorcé(e)",
  veuf: "Veuf / veuve",
};

const OUI_NON_LABELS = {
  oui: "Oui",
  non: "Non",
  so: "Sans objet",
};

const AUTORISATION_LABELS = {
  en_cours: "Demande en cours",
  complete: "Complétée",
  a_faire: "À faire par le cabinet",
};

const LOGICIEL_LABELS = {
  qbo: "QuickBooks Online",
  sage: "Sage",
  excel: "Excel",
  acomba: "Acomba",
  aucun: "Aucun",
  autre: "Autre",
};

const SERVICES_LABELS = {
  tenue_livres: "Tenue de livres",
  paie: "Paie",
  tps_tvq: "Déclarations TPS/TVQ",
  impot_personnel: "Impôt personnel",
  impot_societe: "Impôt des sociétés",
  etats_financiers: "États financiers",
  planification: "Planification fiscale",
  demarrage: "Accompagnement démarrage",
  autre: "Autre",
};

const FREQUENCE_LABELS = {
  hebdo: "Hebdomadaire",
  mensuelle: "Mensuelle",
  trimestrielle: "Trimestrielle",
  annuelle: "Annuelle",
  ponctuelle: "Ponctuelle",
};

const VOLUME_LABELS = {
  faible: "Moins de 50 transactions / mois",
  moyen: "50 à 200 transactions / mois",
  eleve: "200 à 500 transactions / mois",
  tres_eleve: "Plus de 500 transactions / mois",
};

const DOCUMENT_LABELS = {
  form_response_excel: "Réponse du formulaire (Excel)",
  piece_identite: "Pièce d’identité",
  lettre_mission: "Lettre de mission signée",
  certificat_deces: "Certificat de décès",
  lettres_patentes: "Lettres patentes / constitution",
  statuts_constitution: "Statuts de constitution",
  convention_actionnaires: "Convention entre actionnaires",
  proces_verbaux: "Procès-verbaux / résolutions récents",
  reglements_generaux: "Règlements généraux",
  etats_budget_osbl: "États financiers / budget approuvé",
  testament: "Testament",
  liquidateur_doc: "Lettres de vérification / liquidateur",
  inventaire_succession: "Inventaire des biens et dettes",
  declarations_defunt: "Déclarations antérieures du défunt",
  declarations_anterieures: "Déclarations de revenus antérieures",
  etats_financiers_ant: "États financiers antérieurs",
  avis_cotisation: "Avis de cotisation récents",
  fichier_comptable: "Fichier comptable actuel",
  releves_bancaires: "Conciliations bancaires / relevés",
  registre_immo: "Registre des immobilisations / DPA",
};

function labelFromMap(map, value) {
  if (!value) return "—";
  return map[value] || value;
}

function formatDate(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString("fr-CA");
  } catch {
    return value;
  }
}

function formatDateTime(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("fr-CA");
  } catch {
    return value;
  }
}

function formatFileSize(size) {
  if (!size) return "—";

  if (size < 1024) return `${size} o`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} Ko`;

  return `${(size / 1024 / 1024).toFixed(2)} Mo`;
}

function sanitizeArchiveName(name) {
  return (name || "document")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120) || "document";
}

function makeUniqueArchiveName(name, usedNames) {
  const safeName = sanitizeArchiveName(name);
  const dotIndex = safeName.lastIndexOf(".");
  const base = dotIndex > 0 ? safeName.slice(0, dotIndex) : safeName;
  const extension = dotIndex > 0 ? safeName.slice(dotIndex) : "";

  let candidate = safeName;
  let count = 2;

  while (usedNames.has(candidate.toLowerCase())) {
    candidate = `${base}-${count}${extension}`;
    count += 1;
  }

  usedNames.add(candidate.toLowerCase());
  return candidate;
}

function getCrc32(bytes) {
  let crc = -1;

  for (const byte of bytes) {
    crc ^= byte;

    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }

  return (crc ^ -1) >>> 0;
}

function getZipTimestamp(date = new Date()) {
  const time =
    (date.getHours() << 11) |
    (date.getMinutes() << 5) |
    Math.floor(date.getSeconds() / 2);
  const day =
    ((date.getFullYear() - 1980) << 9) |
    ((date.getMonth() + 1) << 5) |
    date.getDate();

  return { time, day };
}

function uint16(value) {
  const bytes = new Uint8Array(2);
  new DataView(bytes.buffer).setUint16(0, value, true);
  return bytes;
}

function uint32(value) {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value, true);
  return bytes;
}

function concatUint8Arrays(parts) {
  const totalLength = parts.reduce((total, part) => total + part.length, 0);
  const output = new Uint8Array(totalLength);
  let offset = 0;

  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }

  return output;
}

function createZipArchive(files) {
  const encoder = new TextEncoder();
  const { time, day } = getZipTimestamp();
  const fileParts = [];
  const centralDirectoryParts = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = encoder.encode(file.name);
    const data = file.data;
    const crc = getCrc32(data);

    const localHeader = concatUint8Arrays([
      uint32(0x04034b50),
      uint16(20),
      uint16(0x0800),
      uint16(0),
      uint16(time),
      uint16(day),
      uint32(crc),
      uint32(data.length),
      uint32(data.length),
      uint16(nameBytes.length),
      uint16(0),
      nameBytes,
    ]);

    fileParts.push(localHeader, data);

    centralDirectoryParts.push(
      concatUint8Arrays([
        uint32(0x02014b50),
        uint16(20),
        uint16(20),
        uint16(0x0800),
        uint16(0),
        uint16(time),
        uint16(day),
        uint32(crc),
        uint32(data.length),
        uint32(data.length),
        uint16(nameBytes.length),
        uint16(0),
        uint16(0),
        uint16(0),
        uint16(0),
        uint32(0),
        uint32(offset),
        nameBytes,
      ])
    );

    offset += localHeader.length + data.length;
  }

  const centralDirectory = concatUint8Arrays(centralDirectoryParts);
  const endOfCentralDirectory = concatUint8Arrays([
    uint32(0x06054b50),
    uint16(0),
    uint16(0),
    uint16(files.length),
    uint16(files.length),
    uint32(centralDirectory.length),
    uint32(offset),
    uint16(0),
  ]);

  return new Blob([...fileParts, centralDirectory, endOfCentralDirectory], {
    type: "application/zip",
  });
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function escapeXml(value) {
  return String(value)
    // Strip characters forbidden in XML spreadsheet cells.
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function getExcelColumnName(index) {
  let name = "";
  let value = index + 1;

  while (value > 0) {
    const remainder = (value - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    value = Math.floor((value - 1) / 26);
  }

  return name;
}

function createExcelWorkbook(rows) {
  const encoder = new TextEncoder();
  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
  const values = [headers, ...rows.map((row) => headers.map((key) => row[key]))];
  const sheetRows = values
    .map((row, rowIndex) => {
      const cells = row
        .map((value, columnIndex) => {
          const reference = `${getExcelColumnName(columnIndex)}${rowIndex + 1}`;
          const style = rowIndex === 0 ? ' s="1"' : "";

          if (typeof value === "boolean") {
            return `<c r="${reference}" t="b"${style}><v>${value ? 1 : 0}</v></c>`;
          }

          if (typeof value === "number" && Number.isFinite(value)) {
            return `<c r="${reference}"${style}><v>${value}</v></c>`;
          }

          return `<c r="${reference}" t="inlineStr"${style}><is><t xml:space="preserve">${escapeXml(value ?? "")}</t></is></c>`;
        })
        .join("");
      return `<row r="${rowIndex + 1}">${cells}</row>`;
    })
    .join("");
  const lastColumn = getExcelColumnName(Math.max(headers.length - 1, 0));
  const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:${lastColumn}${Math.max(values.length, 1)}"/><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="15"/><cols>${headers
    .map((header, index) => `<col min="${index + 1}" max="${index + 1}" width="${Math.min(Math.max(String(header).length + 2, 12), 35)}" customWidth="1"/>`)
    .join("")}</cols><sheetData>${sheetRows}</sheetData><autoFilter ref="A1:${lastColumn}${Math.max(values.length, 1)}"/></worksheet>`;

  const files = [
    {
      name: "[Content_Types].xml",
      data: encoder.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>'),
    },
    {
      name: "_rels/.rels",
      data: encoder.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'),
    },
    {
      name: "xl/workbook.xml",
      data: encoder.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Soumissions" sheetId="1" r:id="rId1"/></sheets></workbook>'),
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      data: encoder.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'),
    },
    {
      name: "xl/styles.xml",
      data: encoder.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF24478B"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs></styleSheet>'),
    },
    { name: "xl/worksheets/sheet1.xml", data: encoder.encode(sheetXml) },
  ];

  return createZipArchive(files);
}

function canPreviewDocument(document) {
  return (
    document?.mime_type?.startsWith("image/") ||
    document?.mime_type === "application/pdf"
  );
}

function getStatusBadgeClass(status) {
  return STATUS_BADGE_CLASSES[status] || DEFAULT_STATUS_BADGE_CLASS;
}

export default function AdminSubmissionsPage() {
  const supabase = useMemo(() => getSupabaseClient(), []);

  const [submissions, setSubmissions] = useState([]);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [documents, setDocuments] = useState([]);

  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [error, setError] = useState("");
  const [documentModal, setDocumentModal] = useState({
    document: null,
    previewUrl: "",
    downloadUrl: "",
    loading: false,
    error: "",
  });
  const [zipDownloading, setZipDownloading] = useState(false);
  const [excelDownloading, setExcelDownloading] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    loadSubmissions();
    // Initial load; subsequent refreshes are explicitly requested by the user.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function closeOnEscape(event) {
      if (event.key === "Escape") {
        closeDocumentModal();
      }
    }

    if (documentModal.document) {
      window.addEventListener("keydown", closeOnEscape);
    }

    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [documentModal.document]);

  async function loadSubmissions() {
    setLoadingList(true);
    setError("");

    const { data, error } = await readIntakePages(supabase, intakeTable);

    if (error) {
      setError(error.message);
      setLoadingList(false);
      return;
    }

    data?.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
    setSubmissions(data || []);
    setLoadingList(false);

    if (data?.length > 0) {
      loadSubmissionDetails(data[0]);
    }
  }

  async function loadSubmissionDetails(submission) {
    setLoadingDetails(true);
    setSelectedSubmission(submission);
    setDocuments([]);

    const { data, error } = await readIntakePages(supabase, intakeDocumentsTable, "*", query => query.eq("submission_id", submission.id));

    if (error) {
      setError(error.message);
      setLoadingDetails(false);
      return;
    }

    setDocuments(data || []);
    setLoadingDetails(false);
  }

  async function openDocument(document) {
    setDocumentModal({
      document,
      previewUrl: "",
      downloadUrl: "",
      loading: true,
      error: "",
    });

    const [previewResult, downloadResult] = await Promise.all([
      supabase.storage
        .from(intakeFilesBucket)
        .createSignedUrl(document.storage_path, 60 * 5),
      supabase.storage
        .from(intakeFilesBucket)
        .createSignedUrl(document.storage_path, 60 * 5, {
          download: document.original_filename,
        }),
    ]);

    if (previewResult.error || downloadResult.error) {
      setDocumentModal((prev) => ({
        ...prev,
        loading: false,
        error:
          previewResult.error?.message ||
          downloadResult.error?.message ||
          "Impossible d’ouvrir le document.",
      }));
      return;
    }

    setDocumentModal({
      document,
      previewUrl: previewResult.data.signedUrl,
      downloadUrl: downloadResult.data.signedUrl,
      loading: false,
      error: "",
    });
  }

  function closeDocumentModal() {
    setDocumentModal({
      document: null,
      previewUrl: "",
      downloadUrl: "",
      loading: false,
      error: "",
    });
  }

  async function downloadAllDocuments() {
    if (documents.length === 0 || zipDownloading) return;

    setZipDownloading(true);

    try {
      const usedNames = new Set();
      const files = [];

      for (const document of documents) {
        const { data, error } = await supabase.storage
          .from(intakeFilesBucket)
          .download(document.storage_path);

        if (error) {
          throw new Error(
            `${document.original_filename || "Document"}: ${error.message}`
          );
        }

        const arrayBuffer = await data.arrayBuffer();
        const label =
          DOCUMENT_LABELS[document.document_type] || document.document_type;

        files.push({
          name: makeUniqueArchiveName(
            `${label}-${document.original_filename || document.id}`,
            usedNames
          ),
          data: new Uint8Array(arrayBuffer),
        });
      }

      const archiveName = `${sanitizeArchiveName(
        selectedSubmission?.nom_legal || "soumission"
      )}-fichiers.zip`;

      downloadBlob(createZipArchive(files), archiveName);
    } catch (error) {
      alert(error.message || "Impossible de télécharger les fichiers.");
    } finally {
      setZipDownloading(false);
    }
  }

  async function exportSubmissionsToExcel() {
    if (filteredSubmissions.length === 0 || excelDownloading) return;

    setExcelDownloading(true);

    try {
      const submissionIds = filteredSubmissions.map((submission) => submission.id);
      const { data: exportedDocuments, error: documentsError } = await readIntakePages(supabase, intakeDocumentsTable, "submission_id, document_type", query => query.in("submission_id", submissionIds));

      if (documentsError) throw documentsError;

      const uploadedBySubmission = new Map();
      for (const document of exportedDocuments || []) {
        if (!uploadedBySubmission.has(document.submission_id)) {
          uploadedBySubmission.set(document.submission_id, new Set());
        }
        uploadedBySubmission
          .get(document.submission_id)
          .add(document.document_type);
      }

      const formFieldNames = Array.from(
        new Set(
          filteredSubmissions.flatMap((submission) =>
            Object.keys(submission.payload?.form_data || {})
          )
        )
      ).sort();
      const repeatFieldNames = Array.from(
        new Set(
          filteredSubmissions.flatMap((submission) =>
            Object.keys(submission.payload?.repeat_data || {})
          )
        )
      ).sort();

      const rows = filteredSubmissions.map((submission) => {
        const formData = submission.payload?.form_data || {};
        const repeatData = submission.payload?.repeat_data || {};
        const uploadedTypes = uploadedBySubmission.get(submission.id) || new Set();
        const row = {
          id: submission.id,
          submitted_at:
            submission.payload?.submitted_at || submission.created_at || "",
          status: submission.status || "",
          type_client: submission.type_client || "",
          nom_legal: submission.nom_legal || "",
          courriel: submission.courriel || "",
          telephone: submission.telephone || "",
        };

        for (const fieldName of formFieldNames) {
          const value = formData[fieldName];
          row[fieldName] = Array.isArray(value) ? value.join(", ") : value ?? "";
        }

        for (const repeatName of repeatFieldNames) {
          row[repeatName] = JSON.stringify(repeatData[repeatName] || []);
        }

        for (const documentType of Object.keys(DOCUMENT_LABELS)) {
          row[`uploaded_${documentType}`] = uploadedTypes.has(documentType);
        }

        return row;
      });

      const date = new Date().toISOString().slice(0, 10);
      downloadBlob(
        createExcelWorkbook(rows),
        `soumissions-${date}.xlsx`
      );
    } catch (error) {
      alert(error.message || "Impossible d’exporter les soumissions.");
    } finally {
      setExcelDownloading(false);
    }
  }

  async function updateStatus(nextStatus) {
    if (!selectedSubmission) return;

    const oldStatus = selectedSubmission.status;

    const { data, error } = await supabase
      .from(intakeTable)
      .update({ status: nextStatus })
      .eq("id", selectedSubmission.id)
      .eq("status", oldStatus)
      .select("id,status,updated_at")
      .single();

    if (error || !data) {
      setError("Modification non confirmée. Actualisez le dossier et vérifiez vos droits administrateur.");
      return;
    }
    // Supabase enregistre l’historique dans la même transaction via un trigger.
    const updated = {
      ...selectedSubmission,
      status: nextStatus,
    };

    setSelectedSubmission(updated);

    setSubmissions((prev) =>
      prev.map((item) => (item.id === updated.id ? updated : item))
    );
  }

  const filteredSubmissions = submissions.filter((item) => {
    const text = `${item.nom_legal || ""} ${item.courriel || ""} ${
      item.telephone || ""
    } ${item.type_client || ""}`.toLowerCase();

    const matchesSearch = text.includes(search.toLowerCase());
    const matchesStatus = statusFilter ? item.status === statusFilter : true;

    return matchesSearch && matchesStatus;
  });

  const payload = selectedSubmission?.payload || {};
  const formData = payload.form_data || {};
  const repeatData = payload.repeat_data || {};

  return (
    <AdminLayout subtitle="Administration des ouvertures de dossiers">
      <main className="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[380px_1fr]">
        <aside className="rounded-[22px] border border-ma-separator/60 bg-white p-5 shadow-[0_18px_45px_rgba(36,71,139,0.08)]">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-extrabold tracking-[-0.03em]">
                Soumissions
              </h1>
              <p className="mt-1 text-sm text-ma-muted">
                {filteredSubmissions.length} dossier(s)
              </p>
            </div>
            <button
              type="button"
              onClick={exportSubmissionsToExcel}
              disabled={filteredSubmissions.length === 0 || excelDownloading}
              className="rounded-[10px] bg-ma-primary px-3 py-2 text-xs font-bold text-white transition hover:bg-ma-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              {excelDownloading ? "Export..." : "Excel"}
            </button>
          </div>

          <div className="mb-4 space-y-3">
            <input
              type="text"
              placeholder="Rechercher par nom, courriel, téléphone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-[10px] border border-ma-separator/75 bg-white px-3.5 py-3 text-sm outline-none focus:border-ma-primary focus:ring-4 focus:ring-ma-primary/15"
            />

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-[10px] border border-ma-separator/75 bg-white px-3.5 py-3 text-sm outline-none focus:border-ma-primary focus:ring-4 focus:ring-ma-primary/15"
            >
              <option value="">Tous les statuts</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div className="mb-4 rounded-[10px] border border-ma-danger/40 bg-ma-danger/10 px-4 py-3 text-sm font-bold text-ma-danger">
              {error}
            </div>
          )}

          {loadingList ? (
            <div className="rounded-xl bg-ma-bg p-5 text-sm text-ma-muted">
              Chargement des soumissions...
            </div>
          ) : (
            <div className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
              {filteredSubmissions.map((submission) => {
                const active = selectedSubmission?.id === submission.id;

                return (
                  <button
                    key={submission.id}
                    type="button"
                    onClick={() => loadSubmissionDetails(submission)}
                    className={[
                      "w-full rounded-2xl border p-4 text-left transition",
                      active
                        ? "border-ma-primary bg-ma-primary/10"
                        : "border-ma-separator/60 bg-white hover:border-ma-primary hover:bg-ma-bg",
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-extrabold text-ma-text">
                          {submission.nom_legal || "Sans nom"}
                        </div>
                        <div className="mt-1 text-xs text-ma-muted">
                          {submission.courriel || "—"}
                        </div>
                      </div>

                      <span
                        className={[
                          "rounded-full border px-2.5 py-1 text-[11px] font-bold",
                          getStatusBadgeClass(submission.status),
                        ].join(" ")}
                      >
                        {submission.status}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-ma-muted">
                      <span>{submission.type_client}</span>
                      <span>•</span>
                      <span>{formatDate(submission.created_at)}</span>
                    </div>
                  </button>
                );
              })}

              {filteredSubmissions.length === 0 && (
                <div className="rounded-xl bg-ma-bg p-5 text-center text-sm text-ma-muted">
                  Aucune soumission trouvée.
                </div>
              )}
            </div>
          )}
        </aside>

        <section className="rounded-[22px] border border-ma-separator/60 bg-white p-6 shadow-[0_18px_45px_rgba(36,71,139,0.08)] lg:p-8">
          {!selectedSubmission ? (
            <div className="rounded-2xl bg-ma-bg p-8 text-center text-ma-muted">
              Sélectionnez une soumission pour consulter le dossier.
            </div>
          ) : loadingDetails ? (
            <div className="rounded-2xl bg-ma-bg p-8 text-center text-ma-muted">
              Chargement du dossier...
            </div>
          ) : (
            <>
              <div className="mb-8 flex flex-col gap-5 border-b border-ma-separator/60 pb-6 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-ma-primary">
                    Dossier client
                  </div>

                  <h2 className="text-3xl font-extrabold tracking-[-0.04em] text-ma-text">
                    {selectedSubmission.nom_legal}
                  </h2>

                  <div className="mt-3 flex flex-wrap gap-2 text-sm text-ma-muted">
                    <span>{selectedSubmission.type_client}</span>
                    <span>•</span>
                    <span>{selectedSubmission.courriel}</span>
                    <span>•</span>
                    <span>{selectedSubmission.telephone}</span>
                  </div>

                  <p className="mt-2 text-xs text-ma-muted">
                    Soumis le {formatDateTime(selectedSubmission.created_at)}
                  </p>
                </div>

                <div className="min-w-55">
                  <label className="mb-2 block text-sm font-bold">
                    Statut du dossier
                  </label>
                  <div
                    className={[
                      "mb-2 inline-flex rounded-full border px-2.5 py-1 text-xs font-bold",
                      getStatusBadgeClass(selectedSubmission.status),
                    ].join(" ")}
                  >
                    {selectedSubmission.status}
                  </div>

                  <select
                    value={selectedSubmission.status}
                    onChange={(e) => updateStatus(e.target.value)}
                    className="w-full rounded-[10px] border border-ma-separator/75 bg-white px-3.5 py-3 text-sm font-bold outline-none focus:border-ma-primary focus:ring-4 focus:ring-ma-primary/15"
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <AdminSection title="1. Identification et coordonnées">
                <InfoGrid>
                  <InfoItem
                    label="Type de client"
                    value={
                      labelFromMap(
                        TYPE_CLIENT_LABELS,
                        formData.type_client
                      ) || selectedSubmission.type_client
                    }
                  />
                  <InfoItem label="Nom légal" value={formData.nom_legal} />
                  <InfoItem
                    label="Nom commercial"
                    value={formData.nom_commercial}
                  />
                  <InfoItem
                    label="Adresse civique"
                    value={
                      formData.adresse_civique ||
                      [
                        formData.adresse_civique_rue,
                        formData.adresse_civique_ville,
                        formData.adresse_civique_province,
                        formData.adresse_civique_cp,
                      ]
                        .filter(Boolean)
                        .join(", ")
                    }
                  />
                  <InfoItem
                    label="Adresse postale"
                    value={formData.adresse_postale}
                  />
                  <InfoItem label="Téléphone" value={formData.telephone} />
                  <InfoItem label="Courriel" value={formData.courriel} />
                  <InfoItem
                    label="Personne-ressource principale"
                    value={formData.contact_principal}
                  />
                  <InfoItem
                    label="Langue"
                    value={labelFromMap(LANGUE_LABELS, formData.langue)}
                  />
                  <InfoItem label="Référé par" value={formData.refere_par} />
                  <InfoItem
                    label="Date d’ouverture"
                    value={formatDate(formData.date_ouverture)}
                  />
                </InfoGrid>
              </AdminSection>

              {(formData.type_client === "particulier" ||
                formData.type_client === "travailleur_autonome") && (
                <AdminSection title="2A. Particulier / Travailleur autonome">
                  <InfoGrid>
                    <InfoItem label="NAS" value={formData.nas} sensitive />
                    <InfoItem
                      label="Date de naissance"
                      value={formatDate(formData.date_naissance)}
                    />
                    <InfoItem
                      label="État civil"
                      value={labelFromMap(
                        ETAT_CIVIL_LABELS,
                        formData.etat_civil
                      )}
                    />
                    <InfoItem
                      label="Date changement état civil"
                      value={formatDate(formData.date_chgmt_etat_civil)}
                    />
                    <InfoItem
                      label="Nom du conjoint"
                      value={formData.conjoint_nom}
                    />
                    <InfoItem
                      label="NAS du conjoint"
                      value={formData.conjoint_nas}
                      sensitive
                    />
                  </InfoGrid>

                  {formData.type_client === "travailleur_autonome" && (
                    <div className="mt-5">
                      <InfoGrid>
                        <InfoItem
                          label="Nature de l’activité"
                          value={formData.activite_nature}
                        />
                        <InfoItem
                          label="Date début activités"
                          value={formatDate(formData.activite_date_debut)}
                        />
                        <InfoItem label="NEQ" value={formData.neq} />
                        <InfoItem
                          label="Inscrit TPS/TVQ"
                          value={labelFromMap(
                            OUI_NON_LABELS,
                            formData.inscrit_taxes
                          )}
                        />
                        <InfoItem
                          label="Numéros TPS/TVQ"
                          value={formData.num_taxes}
                        />
                      </InfoGrid>
                    </div>
                  )}

                  <RepeatPreview
                    title="Personnes à charge"
                    rows={repeatData.personnes_charge}
                    columns={[
                      ["nom", "Nom"],
                      ["date_naissance", "Date de naissance"],
                      ["nas", "NAS"],
                    ]}
                  />
                </AdminSection>
              )}

              {formData.type_client === "societe" && (
                <AdminSection title="2B. Société par actions">
                  <InfoGrid>
                    <InfoItem
                      label="Numéro d’entreprise fédéral"
                      value={formData.ne_federal}
                    />
                    <InfoItem label="NEQ Québec" value={formData.neq_societe} />
                    <InfoItem
                      label="Compte impôt société RC"
                      value={formData.compte_rc}
                    />
                    <InfoItem
                      label="Comptes TPS / TVQ"
                      value={formData.compte_taxes_soc}
                    />
                    <InfoItem
                      label="Compte retenues à la source RP"
                      value={formData.compte_rp}
                    />
                    <InfoItem
                      label="Date de fin d’exercice"
                      value={formData.fin_exercice}
                    />
                    <InfoItem
                      label="Sociétés liées / associées"
                      value={formData.societes_liees}
                    />
                    <InfoItem
                      label="Rapport annuel REQ à jour"
                      value={labelFromMap(OUI_NON_LABELS, formData.req_a_jour)}
                    />
                  </InfoGrid>

                  <RepeatPreview
                    title="Administrateurs"
                    rows={repeatData.administrateurs}
                    columns={[
                      ["nom", "Nom"],
                      ["titre", "Titre"],
                    ]}
                  />

                  <RepeatPreview
                    title="Actionnaires"
                    rows={repeatData.actionnaires}
                    columns={[
                      ["nom", "Nom"],
                      ["pourcentage", "% de détention"],
                      ["categorie", "Catégorie d’actions"],
                    ]}
                  />
                </AdminSection>
              )}

              {formData.type_client === "osbl" && (
                <AdminSection title="2C. OSBL / organisme">
                  <InfoGrid>
                    <InfoItem label="NEQ" value={formData.neq_osbl} />
                    <InfoItem
                      label="Numéro d’organisme de bienfaisance"
                      value={formData.num_bienfaisance}
                    />
                    <InfoItem
                      label="Nature des activités"
                      value={formData.osbl_activites}
                    />
                    <InfoItem
                      label="Sources de financement"
                      value={formData.sources_financement}
                    />
                  </InfoGrid>

                  <RepeatPreview
                    title="Composition du conseil d’administration"
                    rows={repeatData.composition_ca}
                    columns={[
                      ["nom", "Nom"],
                      ["titre", "Titre"],
                    ]}
                  />
                </AdminSection>
              )}

              {formData.type_client === "succession" && (
                <AdminSection title="2D. Succession">
                  <InfoGrid>
                    <InfoItem
                      label="Date de décès"
                      value={formatDate(formData.date_deces)}
                    />
                    <InfoItem
                      label="NAS du défunt"
                      value={formData.nas_defunt}
                      sensitive
                    />
                    <InfoItem
                      label="NAS de la succession"
                      value={formData.nas_succession}
                      sensitive
                    />
                  </InfoGrid>
                </AdminSection>
              )}

              <AdminSection title="3. Documents comptables et fiscaux">
                <InfoGrid>
                  <InfoItem
                    label="Soldes ARC / Revenu Québec"
                    value={formData.soldes_fisc}
                  />
                  <InfoItem
                    label="Logiciel comptable actuel"
                    value={labelFromMap(
                      LOGICIEL_LABELS,
                      formData.logiciel_actuel
                    )}
                  />
                  <InfoItem
                    label="Inventaire de fin d’exercice"
                    value={formData.inventaire_fin_exercice}
                  />
                  <InfoItem
                    label="Coordonnées du comptable précédent"
                    value={formData.comptable_precedent}
                  />
                </InfoGrid>
              </AdminSection>

              <AdminSection title="4. Accès, autorisations et conformité">
                <InfoGrid>
                  <InfoItem
                    label="Autorisation ARC"
                    value={labelFromMap(
                      AUTORISATION_LABELS,
                      formData.autorisation_arc
                    )}
                  />
                  <InfoItem
                    label="Procuration Revenu Québec MR-69"
                    value={labelFromMap(
                      AUTORISATION_LABELS,
                      formData.procuration_mr69
                    )}
                  />
                  <InfoItem
                    label="Accès QBO accordé"
                    value={labelFromMap(OUI_NON_LABELS, formData.acces_qbo)}
                  />
                  <InfoItem
                    label="Dépôt direct"
                    value={formData.depot_direct}
                    sensitive
                  />
                  <InfoItem
                    label="Consentement"
                    value={formData.consentement ? "Oui" : "Non"}
                  />
                  <InfoItem
                    label="Vérification d’identité"
                    value={formData.verif_identite ? "Oui" : "Non"}
                  />
                </InfoGrid>
              </AdminSection>

              <AdminSection title="5. Détail des besoins / mandat">
                <InfoGrid>
                  <InfoItem
                    label="Services demandés"
                    value={
                      Array.isArray(formData.services_demandes)
                        ? formData.services_demandes
                            .map((item) => SERVICES_LABELS[item] || item)
                            .join(", ")
                        : "—"
                    }
                  />
                  <InfoItem
                    label="Fréquence souhaitée"
                    value={labelFromMap(FREQUENCE_LABELS, formData.frequence)}
                  />
                  <InfoItem
                    label="Échéances critiques"
                    value={formData.echeances}
                  />
                  <InfoItem
                    label="Logiciels et systèmes en place"
                    value={formData.logiciels_en_place}
                  />
                  <InfoItem
                    label="Volume de transactions"
                    value={labelFromMap(
                      VOLUME_LABELS,
                      formData.volume_transactions
                    )}
                  />
                  <InfoItem
                    label="Nombre d’employés"
                    value={formData.nb_employes}
                  />
                  <InfoItem
                    label="Attentes de communication"
                    value={formData.attentes_communication}
                  />
                  <InfoItem
                    label="Budget / attentes tarifaires"
                    value={formData.budget}
                  />
                  <InfoItem
                    label="Enjeux particuliers"
                    value={formData.enjeux}
                  />
                </InfoGrid>
              </AdminSection>

              <AdminSection
                title="6. Fichiers téléversés"
                action={
                  documents.length > 0 && (
                    <button
                      type="button"
                      onClick={downloadAllDocuments}
                      disabled={zipDownloading}
                      aria-label={
                        zipDownloading
                          ? "Préparation de l’archive"
                          : "Télécharger tous les fichiers"
                      }
                      title={
                        zipDownloading
                          ? "Préparation de l’archive"
                          : "Télécharger tous les fichiers"
                      }
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-ma-primary hover:bg-ma-primary hover:text-white active:bg-ma-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <DownloadIcon />
                      <span className="sr-only">
                        {zipDownloading
                          ? "Préparation de l’archive"
                          : "Télécharger tous les fichiers"}
                      </span>
                    </button>
                  )
                }
              >
                {documents.length === 0 ? (
                  <div className="rounded-xl bg-ma-bg p-5 text-sm text-ma-muted">
                    Aucun fichier téléversé pour cette soumission.
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-2xl border border-ma-separator/60">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-ma-bg text-ma-muted">
                        <tr>
                          <th className="px-4 py-3">Document</th>
                          <th className="px-4 py-3">Fichier</th>
                          <th className="px-4 py-3">Taille</th>
                          <th className="px-4 py-3">Statut</th>
                          <th className="px-4 py-3 text-right">Action</th>
                        </tr>
                      </thead>

                      <tbody>
                        {documents.map((document) => (
                          <tr
                            key={document.id}
                            className="border-t border-ma-separator/50"
                          >
                            <td className="px-4 py-3 font-bold">
                              {DOCUMENT_LABELS[document.document_type] ||
                                document.document_type}
                            </td>

                            <td className="px-4 py-3 text-ma-muted">
                              {document.original_filename}
                            </td>

                            <td className="px-4 py-3 text-ma-muted">
                              {formatFileSize(document.file_size)}
                            </td>

                            <td className="px-4 py-3">
                              <span
                                className={[
                                  "rounded-full border px-2.5 py-1 text-xs font-bold",
                                  getStatusBadgeClass(document.status),
                                ].join(" ")}
                              >
                                {document.status}
                              </span>
                            </td>

                            <td className="px-4 py-3 text-right">
                              <button
                                type="button"
                                onClick={() => openDocument(document)}
                                aria-label={`Voir ${
                                  document.original_filename || "le document"
                                }`}
                                title="Voir"
                                className="ml-auto grid h-9 w-9 place-items-center rounded-full text-ma-primary hover:bg-ma-primary hover:text-white active:bg-ma-primary-dark"
                              >
                                <EyeIcon />
                                <span className="sr-only">Voir</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </AdminSection>
            </>
          )}
        </section>
      </main>

      {documentModal.document && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ma-text/65 p-4 backdrop-blur-sm">
          <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-[22px] bg-white shadow-[0_24px_70px_rgba(29,38,48,0.28)]">
            <div className="flex flex-col gap-4 border-b border-ma-separator/60 px-5 py-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.14em] text-ma-primary">
                  Aperçu du document
                </div>
                <h2 className="mt-1 text-xl font-extrabold text-ma-text">
                  {DOCUMENT_LABELS[documentModal.document.document_type] ||
                    documentModal.document.document_type}
                </h2>
                <p className="mt-1 text-sm text-ma-muted">
                  {documentModal.document.original_filename}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {documentModal.downloadUrl && (
                  <a
                    href={documentModal.downloadUrl}
                    className="rounded-full bg-ma-primary px-4 py-2.5 text-sm font-extrabold text-white hover:bg-ma-primary-dark"
                  >
                    Télécharger
                  </a>
                )}

                <button
                  type="button"
                  onClick={closeDocumentModal}
                  className="rounded-full border border-ma-separator px-4 py-2.5 text-sm font-bold text-ma-muted hover:border-ma-primary hover:text-ma-primary"
                >
                  Fermer
                </button>
              </div>
            </div>

            <div className="min-h-[55vh] flex-1 bg-ma-bg p-4">
              {documentModal.loading ? (
                <div className="grid min-h-[55vh] place-items-center rounded-2xl bg-white text-sm font-bold text-ma-muted">
                  Chargement du document...
                </div>
              ) : documentModal.error ? (
                <div className="rounded-[10px] border border-ma-danger/40 bg-ma-danger/10 px-4 py-3 text-sm font-bold text-ma-danger">
                  {documentModal.error}
                </div>
              ) : canPreviewDocument(documentModal.document) ? (
                documentModal.document.mime_type?.startsWith("image/") ? (
                  <div className="grid min-h-[55vh] place-items-center rounded-2xl bg-white">
                    <img
                      src={documentModal.previewUrl}
                      alt={documentModal.document.original_filename}
                      className="max-h-[68vh] max-w-full rounded-xl object-contain"
                    />
                  </div>
                ) : (
                  <iframe
                    title={documentModal.document.original_filename}
                    src={documentModal.previewUrl}
                    className="h-[68vh] w-full rounded-2xl border border-ma-separator/60 bg-white"
                  />
                )
              ) : (
                <div className="grid min-h-[55vh] place-items-center rounded-2xl bg-white p-8 text-center">
                  <div>
                    <div className="text-lg font-extrabold text-ma-text">
                      Aperçu non disponible
                    </div>
                    <p className="mt-2 max-w-md text-sm leading-6 text-ma-muted">
                      Ce type de fichier ne peut pas être affiché directement
                      dans le navigateur. Vous pouvez le télécharger pour le
                      consulter.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

function AdminSection({ title, action, children }) {
  return (
    <section className="mb-8">
      <div className="mb-4 flex flex-col gap-3 border-b border-ma-separator/60 pb-2 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-xl font-extrabold text-ma-text">{title}</h3>
        {action}
      </div>

      {children}
    </section>
  );
}

function InfoGrid({ children }) {
  return <div className="grid gap-4 md:grid-cols-2">{children}</div>;
}

function InfoItem({ label, value, sensitive = false }) {
  const displayValue =
    value === undefined || value === null || value === "" ? "—" : value;

  return (
    <div className="rounded-2xl border border-ma-separator/55 bg-white p-4 shadow-[0_8px_20px_rgba(36,71,139,0.04)]">
      <div className="mb-1 text-xs font-bold uppercase tracking-widest text-ma-muted">
        {label}
      </div>

      <div className="whitespace-pre-wrap wrap-break-word text-sm font-semibold text-ma-text">
        {sensitive && displayValue !== "—" ? (
          <span className="text-ma-danger">{displayValue}</span>
        ) : (
          displayValue
        )}
      </div>

      {sensitive && displayValue !== "—" && (
        <div className="mt-2 text-xs text-ma-muted">
          Donnée sensible — accès réservé.
        </div>
      )}
    </div>
  );
}

function RepeatPreview({ title, rows, columns }) {
  const safeRows = Array.isArray(rows) ? rows.filter((row) => row?.nom) : [];

  return (
    <div className="mt-6">
      <h4 className="mb-3 text-sm font-extrabold text-ma-text">{title}</h4>

      {safeRows.length === 0 ? (
        <div className="rounded-xl bg-ma-bg p-4 text-sm text-ma-muted">
          Aucune entrée.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-ma-separator/60">
          <table className="w-full text-left text-sm">
            <thead className="bg-ma-bg text-ma-muted">
              <tr>
                {columns.map(([key, label]) => (
                  <th key={key} className="px-4 py-3">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {safeRows.map((row, index) => (
                <tr key={index} className="border-t border-ma-separator/50">
                  {columns.map(([key]) => (
                    <td key={key} className="px-4 py-3">
                      {row[key] || "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AdminIcon({ children }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4.5 w-4.5"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function DownloadIcon() {
  return (
    <AdminIcon>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M7 10l5 5 5-5" />
      <path d="M12 15V3" />
    </AdminIcon>
  );
}

function EyeIcon() {
  return (
    <AdminIcon>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </AdminIcon>
  );
}
