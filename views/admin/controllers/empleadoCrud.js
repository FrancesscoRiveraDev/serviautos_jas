const conexion = require('../../../database/db');
const bcrypt = require('bcryptjs');

exports.saveEmpleado = (req, res) => {
    // Recibir los datos del formulario
    const { username, password, rol_idRol, dpi, nombre, apellido, telefono, direccion, puesto, sueldo, fechaNac, fechaContratacion } = req.body;

    // Encriptar la contraseña antes de guardar
    bcrypt.hash(password, 10, (err, hashedPassword) => {
        if (err) {
            console.log('Error al encriptar la contraseña:', err);
            return res.status(500).send('Error al encriptar la contraseña');
        }

        // Datos para la tabla usuario
        const usuarioData = {
            user: username,
            password: hashedPassword,
            rol_idRol: rol_idRol,
            estado_usuario_idEstadoUsuario: 1 // Asumiendo que 1 es el estado activo
        };

        // Insertar en la tabla usuario
        conexion.query('INSERT INTO usuario SET ?', usuarioData, (error, usuarioResults) => {
            if (error) {
                console.log('Error al insertar en la tabla usuario:', error);
                return res.status(500).send('Error al insertar en la tabla usuario');
            }

            const idUsuario = usuarioResults.insertId; // Obtener el ID del usuario insertado

            // Datos para la tabla empleado
            const empleadoData = {
                dpi: dpi,
                nombre: nombre,
                apellido: apellido,
                puesto: puesto,
                telefono: telefono,
                direccion: direccion,
                sueldo: sueldo,
                fechaNac: fechaNac,
                fechaContratacion: fechaContratacion,
                usuario_idUsuario: idUsuario
            };

            // Insertar en la tabla empleado
            conexion.query('INSERT INTO empleado SET ?', empleadoData, (error, empleadoResults) => {
                if (error) {
                    console.log('Error al insertar en la tabla empleado:', error);
                    // Si hay un error al insertar en empleado, eliminamos al usuario para mantener la consistencia
                    return conexion.query('DELETE FROM usuario WHERE idUsuario = ?', [idUsuario], (deleteError) => {
                        if (deleteError) {
                            console.log('Error al eliminar el usuario tras fallo en empleado:', deleteError);
                        }
                        return res.status(500).send('Error al insertar en la tabla empleado');
                    });
                }

                // Redirigir a la página de usuarios si todo va bien
                res.redirect('/admin/empleado');
            });
        });
    });
};








// ACTUALIZAR un REGISTRO de USUARIO y EMPLEADO
exports.updateEmpleado = (req, res) => {
    const idUsuario = req.body.idUsuario;
    const rol_idRol = req.body.rol_idRol;  // Solo se actualizará el rol en la tabla usuario

    const dpi = req.body.dpi;
    const nombre = req.body.nombre;
    const apellido = req.body.apellido;
    const telefono = req.body.telefono;
    const direccion = req.body.direccion;
    const puesto = req.body.puesto;
    const sueldo = req.body.sueldo;

    // Actualizar la tabla usuario solo con el rol
    const updateUsuarioQuery = 'UPDATE usuario SET rol_idRol = ? WHERE idUsuario = ?';
    
    conexion.query(updateUsuarioQuery, [rol_idRol, idUsuario], (error, results) => {
        if (error) {
            console.log(error);
            return res.status(500).send('Error actualizando el rol del usuario.');
        }

        // Actualizar la tabla empleado con los campos especificados
        const updateEmpleadoQuery = 'UPDATE empleado SET ? WHERE idEmpleado = ?';
        const empleadoData = {
            dpi: dpi,
            nombre: nombre,
            apellido: apellido,
            telefono: telefono,
            direccion: direccion,
            puesto: puesto,
            sueldo: sueldo
        };

        // Suponiendo que idEmpleado es el mismo que idUsuario, si no, ajusta según tu lógica
        conexion.query(updateEmpleadoQuery, [empleadoData, idUsuario], (error, results) => {
            if (error) {
                console.log(error);
                return res.status(500).send('Error actualizando los datos del empleado.');
            }

            // Redirigir a la vista de usuario tras la actualización
            res.redirect('/admin/empleado');
        });
    });
};
