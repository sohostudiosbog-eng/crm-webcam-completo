// server.js
const express = require('express');
const cors = require('cors');
const pool = require('./db');
const ReportParser = require('./parser');

const app = express();
app.use(cors()); // Permite que el Frontend se conecte
app.use(express.json()); // Permite recibir JSON

// RUTA 1: VISTA PREVIA (No guarda, solo procesa)
app.post('/api/preview', (req, res) => {
  const { plataforma, datos, fecha } = req.body;
  
  if (!plataforma || !datos || !fecha) {
    return res.status(400).json({ error: "Faltan datos requeridos" });
  }

  const resultado = ReportParser.parse(plataforma, datos, fecha);
  res.json(resultado);
});

// RUTA 2: GUARDAR EN BASE DE DATOS
app.post('/api/save', async (req, res) => {
  const { registros } = req.body; // Recibe el array procesado del frontend

  if (!registros || registros.length === 0) {
    return res.status(400).json({ error: "No hay registros para guardar" });
  }

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN'); // Iniciar transacción (todo o nada)

    for (const item of registros) {
      // 1. Buscar ID de la modelo por seudónimo
      const resModelo = await client.query(
        'SELECT id FROM modelos WHERE seudonimo = $1', 
        [item.seudonimo]
      );

      if (resModelo.rows.length > 0) {
        const modeloId = resModelo.rows[0].id;

        // NOTA: Si es EUR, aquí podrías aplicar una conversión temporal o guardarlo en otra columna.
        // Por ahora, asumimos que el valor entra directo a 'dolares' o se maneja en frontend.
        
        // 2. Insertar o Actualizar Ingreso
        await client.query(`
          INSERT INTO ingresos_diarios (modelo_id, fecha, plataforma, dolares)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (modelo_id, fecha, plataforma)
          DO UPDATE SET dolares = EXCLUDED.dolares
        `, [modeloId, item.fecha, item.plataforma, item.valor]);
      } else {
        console.log(`⚠️ Advertencia: Modelo '${item.seudonimo}' no encontrada en BD.`);
      }
    }

    await client.query('COMMIT'); // Guardar cambios permanentemente
    res.json({ success: true, message: "Datos guardados correctamente" });

  } catch (err) {
    await client.query('ROLLBACK'); // Si falla algo, deshacer todo
    console.error(err);
    res.status(500).json({ error: "Error al guardar en base de datos" });
  } finally {
    client.release();
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});