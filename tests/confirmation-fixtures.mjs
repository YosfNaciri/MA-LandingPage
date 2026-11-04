export const person = (relation, prepared_2025, id = relation) => ({ id, relation, prepared_2025, first_name: id, last_name: 'Test' });
export const scenarios = [
 {name:'1 Client 2025 seul', people:[person('self','yes')], expected:['confirmed'], variant:'A'},
 {name:'2 Client et conjoint non client', people:[person('self','yes'),person('spouse','no')], expected:['confirmed','confirmed'], variant:'A'},
 {name:'3 Client conjoint enfant nouveau', people:[person('self','yes'),person('spouse','unknown'),person('child','no')], expected:['confirmed','confirmed','review'], variant:'B'},
 {name:'4 Client parent inconnu', people:[person('self','yes'),person('parent','unknown')], expected:['confirmed','verify'], variant:'B'},
 {name:'5 Répondant nouveau et conjoint', people:[person('self','no'),person('spouse','yes')], expected:['review','review'], variant:'B'},
 {name:'6 Enfant passé à Oui', people:[person('self','yes'),person('child','yes')], expected:['confirmed','confirmed'], variant:'A'},
 {name:'7 Ligne retirée', people:[person('self','yes')], expected:['confirmed'], variant:'A'},
 {name:'8 Sans courriel', people:[person('self','yes')], expected:['confirmed'], variant:'A', noEmail:true},
 {name:'9 Refus', people:[person('self','')], expected:[null], variant:'Non', wants:false},
];
