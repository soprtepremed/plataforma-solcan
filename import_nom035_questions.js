import fs from 'fs';
import XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';

// Parse .env.local to get Supabase credentials
const envContent = fs.readFileSync('.env.local', 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    envVars[parts[0].trim()] = parts.slice(1).join('=').trim();
  }
});

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseAnonKey = envVars.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Error: Supabase URL or Anon Key not found in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const excelPath = "C:\\Users\\X1 Carbon\\Downloads\\Documento de Adolfo R.xlsx";

// 1. Classification metadata for Guía II (FRP)
const GUIA_II_CLASSIFICATION = {
  getQuestionMeta: (num) => {
    let category = "Factores propios de la actividad";
    let dominio = "Condiciones en el ambiente de trabajo";
    let dimension = "Condiciones peligrosas e inseguras";
    let type = "directa";

    if (num >= 1 && num <= 3) {
      category = "Factores propios de la actividad";
      dominio = "Condiciones en el ambiente de trabajo";
      dimension = "Condiciones peligrosas e insalubres";
      type = "directa";
    } else if (num >= 4 && num <= 13) {
      category = "Factores propios de la actividad";
      dominio = "Carga de trabajo";
      if (num <= 5) dimension = "Cargas cuantitativas";
      else if (num <= 7) dimension = "Ritmo de trabajo acelerado";
      else if (num <= 9) dimension = "Carga mental";
      else if (num <= 11) dimension = "Cargas psicológicas emocionales";
      else dimension = "Cargas de alta responsabilidad";
      type = "directa";
    } else if (num >= 14 && num <= 18) {
      category = "Organización del tiempo de trabajo";
      dominio = "Falta de control sobre el trabajo";
      if (num <= 16) dimension = "Falta de claridad sobre funciones";
      else dimension = "Limitada o nula participación y toma de decisiones";
      type = "inversa"; // Control/Clarity are positive
    } else if (num >= 19 && num <= 22) {
      category = "Organización del tiempo de trabajo";
      dominio = "Jornada de trabajo y balance familia";
      if (num <= 20) dimension = "Jornadas de trabajo extensas";
      else dimension = "Interferencia en la relación trabajo-familia";
      type = "directa";
    } else if (num >= 23 && num <= 28) {
      category = "Liderazgo y relaciones en el trabajo";
      dominio = "Liderazgo";
      dimension = "Relaciones con superiores con escasa claridad";
      type = "inversa"; // Positive items about supportive leadership
    } else if (num >= 29 && num <= 34) {
      category = "Liderazgo y relaciones en el trabajo";
      dominio = "Relaciones en el trabajo";
      dimension = "Relaciones sociales difíciles o inexistentes";
      type = "inversa"; // Positive items about supportive coworkers
    } else if (num >= 35 && num <= 40) {
      category = "Liderazgo y relaciones en el trabajo";
      dominio = "Violencia";
      dimension = "Acoso, hostigamiento o malos tratos";
      type = "directa";
    } else if (num >= 41 && num <= 43) {
      category = "Factores propios de la actividad";
      dominio = "Atención a clientes";
      dimension = "Atención a usuarios difíciles o enfermos";
      type = "directa";
    } else if (num >= 44 && num <= 46) {
      category = "Liderazgo y relaciones en el trabajo";
      dominio = "Liderazgo";
      dimension = "Supervisión y actitudes del personal";
      type = "directa";
    }

    return { category, dominio, dimension, type };
  }
};

// 2. Classification metadata for Guía III (FRP y Entorno Organizacional)
const GUIA_III_CLASSIFICATION = {
  getQuestionMeta: (num) => {
    let category = "Entorno organizacional";
    let dominio = "Reconocimiento y pertenencia";
    let dimension = "Sentido de pertenencia";
    let type = "directa";

    // Standard mapping for NOM-035 Guía III
    if (num >= 1 && num <= 5) {
      category = "Factores propios de la actividad";
      dominio = "Condiciones en el ambiente de trabajo";
      dimension = "Condiciones peligrosas e insalubres";
      type = num === 1 || num === 4 ? "inversa" : "directa";
    } else if (num >= 6 && num <= 15) {
      category = "Factores propios de la actividad";
      dominio = "Carga de trabajo";
      if (num <= 10) dimension = "Cargas cuantitativas";
      else if (num <= 12) dimension = "Ritmo de trabajo acelerado";
      else if (num === 13) dimension = "Carga mental";
      else dimension = "Cargas psicológicas emocionales";
      type = "directa";
    } else if (num >= 16 && num <= 18) {
      category = "Factores propios de la actividad";
      dominio = "Falta de control";
      dimension = "Carga de alta responsabilidad";
      type = "directa";
    } else if (num >= 19 && num <= 22) {
      category = "Organización del tiempo de trabajo";
      dominio = "Falta de control sobre el trabajo";
      dimension = "Limitada participación y toma de decisiones";
      type = "inversa";
    } else if (num >= 23 && num <= 24) {
      category = "Organización del tiempo de trabajo";
      dominio = "Jornada de trabajo";
      dimension = "Jornadas de trabajo extensas";
      type = "directa";
    } else if (num >= 25 && num <= 28) {
      category = "Organización del tiempo de trabajo";
      dominio = "Interferencia relación trabajo-familia";
      dimension = "Conflicto trabajo-familia";
      type = "directa";
    } else if (num >= 29 && num <= 33) {
      category = "Liderazgo y relaciones en el trabajo";
      dominio = "Liderazgo";
      dimension = "Características del liderazgo";
      type = "inversa";
    } else if (num >= 34 && num <= 38) {
      category = "Liderazgo y relaciones en el trabajo";
      dominio = "Relaciones en el trabajo";
      dimension = "Relaciones con compañeros";
      type = "inversa";
    } else if (num >= 39 && num <= 43) {
      category = "Entorno organizacional";
      dominio = "Reconocimiento y pertenencia";
      dimension = "Retroalimentación del desempeño";
      type = "inversa";
    } else if (num >= 44 && num <= 49) {
      category = "Liderazgo y relaciones en el trabajo";
      dominio = "Violencia";
      dimension = "Malos tratos y acoso";
      type = "directa";
    } else if (num >= 50 && num <= 57) {
      category = "Factores propios de la actividad";
      dominio = "Atención a clientes";
      dimension = "Atención a usuarios difíciles";
      type = "directa";
    } else if (num >= 58 && num <= 72) {
      category = "Liderazgo y relaciones en el trabajo";
      dominio = "Liderazgo";
      dimension = "Supervisión de personal";
      type = "directa";
    }

    return { category, dominio, dimension, type };
  }
};

async function main() {
  try {
    console.log('Reading Excel file...');
    const workbook = XLSX.readFile(excelPath);

    // 1. SEED CUESTIONARIOS
    console.log('Seeding cuestionarios templates...');
    const questionnaires = [
      { codigo: 'guia_i', nombre: 'Guía de Referencia I - ATS', descripcion: 'Identificación de trabajadores sujetos a acontecimientos traumáticos severos.' },
      { codigo: 'guia_ii', nombre: 'Guía de Referencia II - FRP', descripcion: 'Identificación y análisis de factores de riesgo psicosocial para centros de hasta 50 trabajadores.' },
      { codigo: 'guia_iii', nombre: 'Guía de Referencia III - FRP y EOF', descripcion: 'Identificación y análisis de factores de riesgo psicosocial y evaluación del entorno organizacional.' }
    ];

    const { data: dbCuestionarios, error: qError } = await supabase
      .from('nom035_cuestionarios')
      .upsert(questionnaires, { onConflict: 'codigo' })
      .select();

    if (qError) {
      console.error('Error seeding questionnaires:', qError);
      return;
    }

    console.log('Questionnaires seeded successfully:', dbCuestionarios.map(q => q.codigo));
    
    const idMap = {};
    dbCuestionarios.forEach(q => {
      idMap[q.codigo] = q.id;
    });

    // 2. PARSE ATS (Guía I)
    console.log('\nParsing ATS Sheet...');
    const atsSheet = workbook.Sheets['ATS'];
    const atsRows = XLSX.utils.sheet_to_json(atsSheet, { header: 1 });
    const atsQuestions = [];
    let currentSection = "I.- Acontecimiento traumático severo";
    let qIIndex = 1;

    atsRows.forEach(row => {
      if (!row || row.length === 0) return;
      const cellVal = String(row[0]).trim();
      
      if (cellVal.startsWith('I.-') || cellVal.startsWith('II.-') || cellVal.startsWith('III.-') || cellVal.startsWith('IV.-')) {
        currentSection = cellVal;
      } else if (cellVal.startsWith('¿')) {
        atsQuestions.push({
          cuestionario_id: idMap['guia_i'],
          numero: qIIndex++,
          seccion: currentSection,
          texto: cellVal,
          categoria: 'Trauma y estrés',
          dominio: currentSection,
          dimension: 'Identificación de eventos',
          tipo_puntuacion: 'binaria'
        });
      }
    });

    console.log(`Parsed ${atsQuestions.length} questions for Guía I (ATS).`);

    // 3. PARSE FRP (Guía II)
    console.log('\nParsing FRP Sheet...');
    const frpSheet = workbook.Sheets['FRP'];
    const frpRows = XLSX.utils.sheet_to_json(frpSheet, { header: 1 });
    const frpQuestions = [];
    let currentFRPSection = "Sección General";

    frpRows.forEach(row => {
      if (!row || row.length === 0) return;
      
      const numCell = row[0];
      const textCell = row[1];
      
      if (typeof numCell === 'number' && textCell) {
        const meta = GUIA_II_CLASSIFICATION.getQuestionMeta(numCell);
        frpQuestions.push({
          cuestionario_id: idMap['guia_ii'],
          numero: numCell,
          seccion: currentFRPSection,
          texto: String(textCell).trim(),
          categoria: meta.category,
          dominio: meta.dominio,
          dimension: meta.dimension,
          tipo_puntuacion: meta.type
        });
      } else if (numCell && !textCell && String(numCell).trim() !== '' && isNaN(Number(numCell))) {
        currentFRPSection = String(numCell).trim().replace(/\r\n/g, ' ');
      }
    });

    console.log(`Parsed ${frpQuestions.length} questions for Guía II (FRP).`);

    // 4. PARSE FRP Y EOF (Guía III)
    console.log('\nParsing FRP Y EOF Sheet...');
    const frpEOFSheet = workbook.Sheets['FRP Y EOF'];
    const frpEOFRows = XLSX.utils.sheet_to_json(frpEOFSheet, { header: 1 });
    const frpEOFQuestions = [];
    let currentEOFSection = "Sección General";

    frpEOFRows.forEach(row => {
      if (!row || row.length === 0) return;
      
      const numCell = row[0];
      const textCell = row[1];
      
      if (typeof numCell === 'number' && textCell) {
        const meta = GUIA_III_CLASSIFICATION.getQuestionMeta(numCell);
        frpEOFQuestions.push({
          cuestionario_id: idMap['guia_iii'],
          numero: numCell,
          seccion: currentEOFSection,
          texto: String(textCell).trim(),
          categoria: meta.category,
          dominio: meta.dominio,
          dimension: meta.dimension,
          tipo_puntuacion: meta.type
        });
      } else if (numCell && !textCell && String(numCell).trim() !== '' && isNaN(Number(numCell))) {
        currentEOFSection = String(numCell).trim().replace(/\r\n/g, ' ');
      }
    });

    console.log(`Parsed ${frpEOFQuestions.length} questions for Guía III (FRP y EOF).`);

    // 5. INSERT ALL QUESTIONS TO DATABASE
    const allQuestions = [...atsQuestions, ...frpQuestions, ...frpEOFQuestions];
    console.log(`\nInserting ${allQuestions.length} total questions into Supabase...`);

    const { error: insError } = await supabase
      .from('nom035_preguntas')
      .upsert(allQuestions, { onConflict: 'cuestionario_id,numero' });

    if (insError) {
      console.error('Error inserting questions to database:', insError);
      return;
    }

    console.log('🎉 All questions from Excel have been imported and classified in Supabase successfully!');
    
  } catch (error) {
    console.error('Fatal execution error:', error);
  }
}

main();
