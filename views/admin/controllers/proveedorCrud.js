const conexion = require('../../../database/db');
const bcrypt = require('bcryptjs');

const moment = require('moment-timezone');

exports.saveProveedor = (req, res) => {
    // Recibir los datos del formulario
    const { nombre, telefono, telefono2, direccion, email, vendedor } = req.body;

    // Obtener la fecha y hora actual del sistema
    const fechaRegistro = moment().tz("America/Guatemala").format("YYYY-MM-DD HH:mm:ss");

    // Datos para la tabla proveedor
    const proveedorData = {
        nombre: nombre,
        telefono: telefono,
        telefono2: telefono2,
        direccion: direccion,
        email: email,
        vendedor: vendedor,
        fechaRegistro: fechaRegistro,
        estado_proveedor_idEstadoProveedor: 1 // Estado por defecto: activo
    };

    // Insertar en la tabla proveedor
    conexion.query('INSERT INTO proveedor SET ?', proveedorData, (error, proveedorResults) => {
        if (error) {
            console.log('Error al insertar en la tabla proveedor:', error);
            return res.status(500).send('Error al insertar en la tabla proveedor');
        }

        // Redirigir a la página de proveedores si todo va bien
        res.redirect('/admin/proveedor');
    });
};


// ACTUALIZAR un REGISTRO de PROVEEDOR
exports.updateProveedor = (req, res) => {
    const idProveedor = req.body.idProveedor;
    const nombre = req.body.nombre;
    const telefono = req.body.telefono;
    const telefono2 = req.body.telefono2;
    const direccion = req.body.direccion;
    const email = req.body.email;
    const vendedor = req.body.vendedor;

    // Actualizar la tabla proveedor con los campos especificados
    const updateProveedorQuery = 'UPDATE proveedor SET nombre = ?, telefono = ?, telefono2 = ?, direccion = ?, email = ?, vendedor = ? WHERE idProveedor = ?';
    
    conexion.query(updateProveedorQuery, [nombre, telefono, telefono2, direccion, email, vendedor, idProveedor], (error, results) => {
        if (error) {
            console.log(error);
            return res.status(500).send('Error actualizando los datos del proveedor.');
        }

        // Redirigir a la vista de proveedores tras la actualización
        res.redirect('/admin/proveedor');
    });
};


