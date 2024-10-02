const conexion = require('../../../database/db');
const moment = require('moment-timezone');



exports.updateMensaje = (req, res) => {
    const idMensaje = req.body.idMensaje;
    const estado = req.body.estado; // Supongo que el estado se pasa desde el select

    // Prepara el objeto de actualización
    const updateData = {
        estado_mensaje_idEstadoMensaje: estado,
    };

    // Si el estado es 2, agrega la fechaLeido
    if (estado == 2) {
        updateData.fechaLeido = moment().tz("America/Guatemala").format('YYYY-MM-DD HH:mm:ss'); // Ajusta la zona horaria según sea necesario
    }

    conexion.query('UPDATE mensaje SET ? WHERE idMensaje = ?', [updateData, idMensaje], (error, results) => {
        if (error) {
            console.log(error);
            return res.status(500).send('Error al actualizar el mensaje');
        } else {
            res.redirect('/admin/mensaje');
        }
    });
};
