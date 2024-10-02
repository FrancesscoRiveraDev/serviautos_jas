const conexion = require('../../../database/db');
const bcrypt = require('bcryptjs');


exports.saveProducto = (req, res) => {
    // Recibir los datos del formulario
    const { nombre, precioUnitario, precioSugerido, categoria_idCategoria, marca_idMarca, unidad_medida_idUnidadMedida } = req.body;

   
    // Datos para la tabla producto
    const productoData = {
        nombre: nombre,
        precioUnitario: parseFloat(precioUnitario), // Asegurarse de que sea un número decimal
        precioSugerido: parseFloat(precioSugerido), // Asegurarse de que sea un número decimal
        stock: 0 ,
        categoria_idCategoria: categoria_idCategoria,
        marca_idMarca: marca_idMarca,
        unidad_medida_idUnidadMedida: unidad_medida_idUnidadMedida,
        estado_producto_idEstadoProducto: 1 // Estado por defecto: activado
        
    };

    // Insertar en la tabla producto
    conexion.query('INSERT INTO producto SET ?', productoData, (error, productoResults) => {
        if (error) {
            console.log('Error al insertar en la tabla producto:', error);
            return res.status(500).send('Error al insertar en la tabla producto');
        }

        // Redirigir a la página de productos si todo va bien
        res.redirect('/admin/producto');
    });
};



// ACTUALIZAR un REGISTRO de PRODUCTO
exports.updateProducto = (req, res) => {
    const idProducto = req.body.idProducto;
    const nombre = req.body.nombre;
    const precioUnitario = req.body.precioUnitario;
    const precioSugerido = req.body.precioSugerido;
    const categoria_idCategoria = req.body.categoria_idCategoria;
    const marca_idMarca = req.body.marca_idMarca;
    const unidad_medida_idUnidadMedida = req.body.unidad_medida_idUnidadMedida;
    const estado_producto_idEstadoProducto = req.body.estado_producto_idEstadoProducto;

    // Actualizar la tabla producto con los campos especificados
    const updateProductoQuery = `
        UPDATE producto SET 
            nombre = ?, 
            precioUnitario = ?, 
            precioSugerido = ?, 
            categoria_idCategoria = ?, 
            marca_idMarca = ?, 
            unidad_medida_idUnidadMedida = ?, 
            estado_producto_idEstadoProducto = ? 
        WHERE idProducto = ?`;

    conexion.query(updateProductoQuery, [nombre, precioUnitario, precioSugerido, categoria_idCategoria, marca_idMarca, unidad_medida_idUnidadMedida, estado_producto_idEstadoProducto, idProducto], (error, results) => {
        if (error) {
            console.log(error);
            return res.status(500).send('Error actualizando los datos del producto.');
        }

        // Redirigir a la vista de productos tras la actualización
        res.redirect('/admin/producto');
    });
};





