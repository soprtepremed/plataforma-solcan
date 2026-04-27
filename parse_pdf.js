import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

async function run() {
    const dataBuffer = fs.readFileSync('C:/Users/X1 Carbon/Downloads/catlago orthin.pdf');
    const data = await pdf(dataBuffer);
    const text = data.text;

    // Split text into chunks separated by "____________________"
    const blocks = text.split(/_{10,}/);
    const studies = [];
    let claves = [];

    // Extract all claves from the whole document first
    const claveRegex = /Clave de estudio:\s*(\d+)/gi;
    let match;
    while ((match = claveRegex.exec(text)) !== null) {
      claves.push(match[1]);
    }

    let claveIndex = 0;

    for (let i = 0; i < blocks.length - 1; i++) {
        const block1 = blocks[i].trim();
        const block2 = blocks[i+1].trim();
        
        const lines1 = block1.split('\n');
        let nombreRaw = lines1[lines1.length - 1].trim();
        
        nombreRaw = nombreRaw.replace(/Clave de estudio:\s*\d+/gi, '').trim();

        if (!nombreRaw || nombreRaw.startsWith('Aviso:') || nombreRaw.includes('ESTUDIOS Y PERFILES')) {
            continue; 
        }

        let acreditado = false;
        let subrogado = false;
        if (nombreRaw.endsWith('**')) { subrogado = true; nombreRaw = nombreRaw.slice(0, -2).trim(); }
        else if (nombreRaw.endsWith('*')) { acreditado = true; nombreRaw = nombreRaw.slice(0, -1).trim(); }

        const lines2 = block2.split('\n');
        let metodologia = '', contenido = 'NA', muestra = '', tiempo = '';

        for (let line of lines2) {
            line = line.trim();
            if (line.startsWith('Metodología:')) metodologia = line.replace('Metodología:', '').trim();
            else if (line.startsWith('Contenido:')) contenido = line.replace('Contenido:', '').trim();
            else if (line.startsWith('Tipo de muestra(s):')) muestra = line.replace('Tipo de muestra(s):', '').trim();
            else if (line.startsWith('Tiempo de entrega:')) tiempo = line.replace('Tiempo de entrega:', '').trim();
            
            if (line.toLowerCase().includes('clave de estudio:')) break;
        }

        if (nombreRaw && metodologia && muestra) {
            const clave = claves[claveIndex] || ('00' + claveIndex);
            claveIndex++;

            studies.push({
                clave_orthin: clave,
                nombre: nombreRaw.replace(/'/g, "''"),
                metodologia: metodologia.replace(/'/g, "''"),
                contenido: contenido.replace(/'/g, "''"),
                tipo_muestra: muestra.replace(/'/g, "''"),
                tiempo_entrega: tiempo.replace(/'/g, "''"),
                acreditado_ema: acreditado,
                subrogado: subrogado
            });
        }
    }

    console.log(`Se encontraron ${studies.length} estudios y ${claves.length} claves.`);
    
    let sql = `-- Carga Masiva de Catálogo Orthin\n`;
    sql += `INSERT INTO public.especiales_catalogo (clave_orthin, nombre, metodologia, contenido, tipo_muestra, tiempo_entrega, acreditado_ema, subrogado)\nVALUES\n`;
    
    const values = studies.map(s => 
      `('${s.clave_orthin}', '${s.nombre}', '${s.metodologia}', '${s.contenido}', '${s.tipo_muestra}', '${s.tiempo_entrega}', ${s.acreditado_ema}, ${s.subrogado})`
    );

    sql += values.join(',\n') + '\nON CONFLICT DO NOTHING;\n';

    fs.writeFileSync('catalogo_data_completo.sql', sql);
    console.log('Archivo catalogo_data_completo.sql generado con éxito.');
}

run().catch(console.error);
