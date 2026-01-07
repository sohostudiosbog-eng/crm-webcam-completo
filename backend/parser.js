// parser.js
class ReportParser {

  static parse(plataforma, textoInput, fechaSeleccionada) {
    try {
      let data = null;
      // Intentamos parsear JSON, excepto para Bonga/XLove que son texto
      if (!['bongacams', 'xlove'].includes(plataforma.toLowerCase())) {
         try { data = JSON.parse(textoInput); } catch(e) { /* Es texto plano */ }
      }

      switch(plataforma.toLowerCase()) {
        case 'cam4':
          return this.processCam4(data, fechaSeleccionada);
        case 'stripchat':
          return this.processStripchat(data, fechaSeleccionada);
        case 'bongacams':
          return this.processBongacams(textoInput, fechaSeleccionada);
        case 'xlove':
          return this.processXlove(textoInput, fechaSeleccionada);
        default:
          throw new Error("Plataforma no configurada");
      }
    } catch (error) {
      return { error: true, mensaje: "Error procesando: " + error.message };
    }
  }

  static processCam4(data, fecha) {
    const registros = Array.isArray(data) ? data : [];
    return registros.map(item => ({
      fecha, seudonimo: item.performerName,
      valor: (parseFloat(item.amount || 0) * 0.10).toFixed(2), moneda: 'USD', plataforma: 'Cam4'
    }));
  }

  static processStripchat(data, fecha) {
    const registros = data.earnings || [];
    return registros.map(item => ({
      fecha, seudonimo: item.username,
      valor: parseFloat(item.usdTotal || 0).toFixed(2), moneda: 'USD', plataforma: 'Stripchat'
    }));
  }

  static processBongacams(texto, fecha) {
    const lineas = texto.split('\n');
    const resultados = [];
    lineas.forEach(linea => {
      if (linea.startsWith('Income') || linea.startsWith('Total') || linea.trim() === '') return;
      const matchUsuario = linea.match(/^([^\s(]+)/);
      const matchDinero = linea.match(/\$([0-9,]+\.[0-9]{2})\s*$/);
      if (matchUsuario && matchDinero) {
        resultados.push({
          fecha, seudonimo: matchUsuario[1],
          valor: matchDinero[1].replace(',', ''), moneda: 'USD', plataforma: 'Bongacams'
        });
      }
    });
    return resultados;
  }

  static processXlove(texto, fecha) {
    const lineas = texto.split('\n');
    const resultados = [];
    lineas.forEach(linea => {
      const matchNombre = linea.match(/^([a-zA-Z0-9_]+)/);
      const matchDinero = linea.match(/([0-9]+,[0-9]{2})\s*€/); // Busca Euros
      if (matchNombre && matchDinero) {
        resultados.push({
          fecha, seudonimo: matchNombre[1],
          valor: matchDinero[1].replace(',', '.'), moneda: 'EUR', plataforma: 'XLove'
        });
      }
    });
    return resultados;
  }
}

module.exports = ReportParser;