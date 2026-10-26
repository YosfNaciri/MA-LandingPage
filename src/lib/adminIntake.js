// Read every page, including when the server caps responses below our page size.
export async function readIntakePages(client, table, columns = "*", filter) {
  const rows = [];
  try {
    for (let offset = 0; ;) {
      let query = client.from(table).select(columns).order("id").range(offset, offset + 499);
      if (filter) query = filter(query);
      const { data, error } = await query;
      if (error) return { data: null, error };
      if (!data?.length) return { data: rows, error: null };
      rows.push(...data);
      offset += data.length;
    }
  } catch (error) { return { data: null, error }; }
}
