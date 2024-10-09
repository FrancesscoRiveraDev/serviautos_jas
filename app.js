// 1 - Invocamos a Express
const express = require('express');
const app = express();
const path = require('path');
const PDFDocument = require('pdfkit');
const moment = require('moment-timezone');
const bodyParser = require('body-parser');

//2 - Para poder capturar los datos del formulario (sin urlencoded nos devuelve "undefined")
app.use(express.urlencoded({extended:false}));
app.use(express.json());//además le decimos a express que vamos a usar json
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
//3- Invocamos a dotenv
const dotenv = require('dotenv');
dotenv.config({ path: './env/.env'});

//4 -seteamos el directorio de assets
//app.use('/resources',express.static('public'));
//app.use('/resources', express.static(__dirname + '/public'));

// Servir archivos estáticos desde la carpeta 'public'
app.use(express.static(path.join(__dirname, 'public')));



// Configura el motor de vistas
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));


//5 - Establecemos el motor de plantillas
app.set('view engine','ejs');

//6 -Invocamos a bcrypt
const bcrypt = require('bcryptjs');

//7- variables de session
const session = require('express-session');
app.use(session({
	secret: 'secret',
	resave: true,
	saveUninitialized: true
}));


////////////////////////////////////////////////////////////////////////////////////////////
//algunas vistas

//quienes somos
app.get('/cliente/quienessomos',(req, res)=>{
	res.render('cliente/quienessomos');
})

//servicios
app.get('/cliente/servicios',(req, res)=>{
	res.render('cliente/servicios');
})

//contactanos
app.get('/cliente/contactanos',(req, res)=>{
	res.render('cliente/contactanos');
})

//dashboard para admin
app.get('/admin/dashboard',(req, res)=>{
	res.render('admin/dashboard');
})

//dashboard para mecanicos
app.get('/admin/dashboard2',(req, res)=>{
	res.render('admin/dashboard2');
})




//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////



app.post('/login', (req, res) => {
    const { user, password } = req.body;

    const sql = 'SELECT * FROM usuario WHERE user = ?';

    conexion.query(sql, [user], async (err, results) => {
        if (err) {
            console.error('Error al iniciar sesión: ', err);
            return res.status(500).send('Error en el servidor');
        }

        if (results.length > 0) {
            const user = results[0];

            // Verificar si el usuario está activo
            if (user.estado_usuario_idEstadoUsuario !== 1) {
                // Renderizar el login con un mensaje de error si el usuario no está activo
                return res.render('admin/login', { error: 'Usuario no activo' });
            }

            // Verificar la contraseña
            const passwordMatch = await bcrypt.compare(password, user.password);

            if (passwordMatch) {
                const idUsuario = user.idUsuario;

                // Obtener la hora actual del servidor en la zona horaria correcta
                const fechaHoraInicio = moment().format('YYYY-MM-DD HH:mm:ss');

                // Insertar registro de inicio de sesión
                const sqlInsert = 'INSERT INTO registro_sesiones (usuario_idUsuario, fecha_hora_inicio) VALUES (?, ?)';
                conexion.query(sqlInsert, [idUsuario, fechaHoraInicio], (err, result) => {
                    if (err) {
                        console.error('Error al registrar la sesión: ', err);
                    }
                });

                // Redirigir según el rol del usuario
                if (user.rol_idRol === 1) {
                    res.redirect('/admin/dashboard');
                } else if (user.rol_idRol === 2) {
                    res.redirect('/admin/dashboard2');
                } else {
                    // Renderizar el login con un mensaje de error si el rol no es reconocido
                    res.render('admin/login', { error: 'Rol de usuario no reconocido' });
                }
            } else {
                // Renderizar el login con un mensaje de error si la contraseña es incorrecta
                res.render('admin/login', { error: 'Usuario o contraseña incorrectos' });
            }
        } else {
            // Renderizar el login con un mensaje de error si el usuario no existe
            res.render('admin/login', { error: 'Usuario o contraseña incorrectos' });
        }
    });
});



//////////////////////////////////////////////////////////////////////////////////////////////
//para acciones de usuario


app.get('/admin/usuario', (req, res) => {
    const { usuario = '', tipoCuenta = '', estado = '', pagina = 1 } = req.query;

    const registrosPorPagina = 4;
    const offset = (pagina - 1) * registrosPorPagina;

    // Consulta con filtros dinámicos y uniones para obtener nombres
    let query = `
        SELECT 
            u.*, 
            r.tipo AS nombreRol, 
            e.nombre AS nombreEstado 
        FROM usuario u
        LEFT JOIN rol r ON u.rol_idRol = r.idRol
        LEFT JOIN estado_usuario e ON u.estado_usuario_idEstadoUsuario = e.idEstadoUsuario
        WHERE 1=1
    `;

    // Agregar filtros a la consulta si existen
    if (usuario) {
        query += ` AND u.user LIKE '%${usuario}%'`;
    }
    if (tipoCuenta) {
        query += ` AND r.tipo LIKE '%${tipoCuenta}%'`;
    }
    if (estado) {
        query += ` AND e.nombre LIKE '%${estado}%'`;
    }

    // Agregar la paginación
    query += ` LIMIT ${registrosPorPagina} OFFSET ${offset}`;

    conexion.query(query, (err, results) => {
        if (err) {
            console.error('Error al obtener los usuarios:', err);
            return res.status(500).send('Error en el servidor');
        }

        // Consulta para obtener el total de registros filtrados
        let totalQuery = `
            SELECT COUNT(*) as total 
            FROM usuario u
            LEFT JOIN rol r ON u.rol_idRol = r.idRol
            LEFT JOIN estado_usuario e ON u.estado_usuario_idEstadoUsuario = e.idEstadoUsuario
            WHERE 1=1
        `;

        // Aplicar los mismos filtros a la consulta de total de registros
        if (usuario) {
            totalQuery += ` AND u.user LIKE '%${usuario}%'`;
        }
        if (tipoCuenta) {
            totalQuery += ` AND r.tipo LIKE '%${tipoCuenta}%'`;
        }
        if (estado) {
            totalQuery += ` AND e.nombre LIKE '%${estado}%'`;
        }

        conexion.query(totalQuery, (err, totalResults) => {
            if (err) {
                console.error('Error al obtener el total de usuarios:', err);
                return res.status(500).send('Error en el servidor');
            }

            const totalRegistros = totalResults[0].total;
            const totalPaginas = Math.ceil(totalRegistros / registrosPorPagina);

            // Renderizar la vista con los resultados filtrados
            res.render('admin/usuario', {
                results,
                paginaActual: parseInt(pagina, 10),
                totalPaginas,
                usuario, // Mantén los valores de los filtros para que persistan
                tipoCuenta,
                estado
            });
        });
    });
});








app.get('/admin/usuarioCreate',(req, res)=>{
    res.render('admin/usuarioCreate');
})


app.get('/admin/usuarioEdit/:idUsuario', (req, res) => {    
    const idUsuario = req.params.idUsuario;

    // Primero, selecciona los datos del usuario
    conexion.query('SELECT * FROM usuario WHERE idUsuario = ?', [idUsuario], (error, results) => {
        if (error) {
            throw error;
        } else {
            // Verifica si el usuario existe antes de hacer la segunda consulta
            if (results.length > 0) {
                const usuario = results[0];
                const idEmpleado = usuario.idUsuario; // Ajusta según el nombre del campo correcto si es diferente

                // Luego, selecciona los datos del empleado relacionado
                conexion.query('SELECT * FROM empleado WHERE idEmpleado = ?', [idEmpleado], (error, empleadoResults) => {
                    if (error) {
                        throw error;
                    } else {
                        // Renderiza la vista con los datos tanto del usuario como del empleado
                        res.render('admin/usuarioEdit', {
                            usuario: usuario,
                            empleado: empleadoResults[0] // Ajusta según lo que necesites mostrar
                        });
                    }
                });
            } else {
                res.status(404).send('Usuario no encontrado');
            }
        }
    });
});


////////////////////////////////////////////////////////////////////////////////////////////////////////
//dar de baja

app.get('/admin/usuarioDelete/:idUsuario', (req, res) => {
    const idUsuario = req.params.idUsuario;

    // Obtener la fecha actual del sistema en formato YYYY-MM-DD
    const fechaDespido = moment().format('YYYY-MM-DD HH:mm:ss');
    // Actualizar el estado del usuario a 2 en la tabla usuario
    const updateUsuarioQuery = 'UPDATE usuario SET estado_usuario_idEstadoUsuario = 2 WHERE idUsuario = ?';
    
    conexion.query(updateUsuarioQuery, [idUsuario], (error, results) => {
        if (error) {
            console.log(error);
            return res.status(500).send('Error actualizando el estado del usuario.');
        }

        // Actualizar la fecha de despido en la tabla empleado
        const updateEmpleadoQuery = 'UPDATE empleado SET fechaDespido = ? WHERE idEmpleado = ?';
        
        conexion.query(updateEmpleadoQuery, [fechaDespido, idUsuario], (error, results) => {
            if (error) {
                console.log(error);
                return res.status(500).send('Error actualizando la fecha de despido del empleado.');
            }

            // Redirigir a la vista de usuario tras la actualización
            res.redirect('/admin/usuario');
        });
    });
});

/////////////////////////////////////////////////////////////////////////////////////////////////////
// para generar el reporte individual

// para generar el reporte individual

// Ruta para generar el reporte en PDF de un usuario individual
app.get('/admin/usuarioReporte/:idUsuario', (req, res) => {
    const idUsuario = req.params.idUsuario;

    // Consulta para obtener los datos del usuario
    const queryUsuario = `
        SELECT u.idUsuario, u.user, u.estado_usuario_idEstadoUsuario, e.dpi, e.nombre, e.apellido, e.telefono, e.direccion, e.puesto, e.sueldo, e.fechaNac, e.fechaContratacion, e.fechaDespido
        FROM usuario u
        JOIN empleado e ON u.idUsuario = e.idEmpleado
        WHERE u.idUsuario = ?;
    `;

    conexion.query(queryUsuario, [idUsuario], (error, results) => {
        if (error) {
            console.log(error);
            return res.status(500).send('Error al obtener los datos del usuario.');
        }

        if (results.length === 0) {
            return res.status(404).send('Usuario no encontrado.');
        }

        const usuario = results[0];

        const formatFecha = (fecha) => {
            if (!fecha) return 'Actualmente laborando';
            const date = new Date(fecha);
            return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
        };

       
        // Crear un documento PDF
        const doc = new PDFDocument();
        res.setHeader('Content-Disposition', 'attachment; filename=reporte_' + usuario.nombre +'_'+ usuario.apellido +'.pdf');
        res.setHeader('Content-Type', 'application/pdf');
        doc.pipe(res);

        // Ruta del logo de la empresa
        const logoPath = path.join(__dirname, '/public/img/logo.jpg'); // Ajusta esta ruta según la ubicación de tu logo
        
        // Agregar el logo y la información de la empresa
        doc.image(logoPath, { align: 'center' ,  width: 100 }) // Ajusta las dimensiones y la posición según sea necesario
           .fontSize(20)
           .text('Serviautos Jas', { align: 'center' }) // Ajusta el nombre y la posición según sea necesario
           .moveDown();

        // Agregar título y detalles del usuario
        doc.fontSize(18).text('Reporte de Usuario', { align: 'center' });
        doc.moveDown();
        doc.moveDown();

        doc.fontSize(12).text(`ID Usuario: ${usuario.idUsuario}`);
        doc.text(`Usuario: ${usuario.user}`);

        // Mostrar "Activo" o "Inactivo" según el estado
        const estadoUsuario = usuario.estado_usuario_idEstadoUsuario === 1 ? 'Activo' : 'Inactivo';
        doc.text(`Estado Usuario: ${estadoUsuario}`);
        
        doc.moveDown();
        doc.fontSize(14).text('Datos del Empleado:', { underline: true });
        doc.fontSize(12).text(`DPI: ${usuario.dpi}`);
        doc.text(`Nombre: ${usuario.nombre}`);
        doc.text(`Apellido: ${usuario.apellido}`);
        doc.text(`Teléfono: ${usuario.telefono}`);
        doc.text(`Dirección: ${usuario.direccion}`);
        doc.text(`Puesto: ${usuario.puesto}`);
        doc.text(`Sueldo: Q. ${usuario.sueldo}`);
        doc.text(`Fecha de Nacimiento: ${formatFecha(usuario.fechaNac)}`);
        doc.text(`Fecha de Contratación: ${formatFecha(usuario.fechaContratacion)}`);
        doc.text(`Fecha de Despido: ${formatFecha(usuario.fechaDespido) || 'Actualmente laborando'}`);

        // Finalizar el PDF
        doc.end();
    });
});


// Ruta para generar el reporte en PDF de todos los usuarios activos
app.get('/admin/usuarioReporteActivo', (req, res) => {

    // Consulta para obtener todos los usuarios activos
    const queryUsuariosActivos = `
        SELECT u.idUsuario, u.user, u.estado_usuario_idEstadoUsuario, e.dpi, e.nombre, e.apellido, e.telefono, e.direccion, e.puesto, e.sueldo, e.fechaContratacion, e.fechaDespido
        FROM usuario u
        JOIN empleado e ON u.idUsuario = e.idEmpleado
        WHERE u.estado_usuario_idEstadoUsuario = 1;
    `;

    conexion.query(queryUsuariosActivos, (error, results) => {
        if (error) {
            console.log(error);
            return res.status(500).send('Error al obtener los datos de los usuarios.');
        }

        if (results.length === 0) {
            return res.status(404).send('No se encontraron usuarios activos.');
        }

        // Crear un documento PDF
        const doc = new PDFDocument({ margin: 30 });
        res.setHeader('Content-Disposition', 'attachment; filename=reporte_usuarios_activos.pdf');
        res.setHeader('Content-Type', 'application/pdf');
        doc.pipe(res);

        // Ruta del logo de la empresa
        const logoPath = path.join(__dirname, '/public/img/logo.jpg'); // Ajusta esta ruta según la ubicación de tu logo
        
        // Agregar el logo y la información de la empresa
        doc.image(logoPath, { width: 80, align: 'center' })
            .fontSize(20)
            .text('Serviautos Jas', { align: 'center' })
            .moveDown();

        // Título del reporte
        doc.fontSize(18).text('Reporte de Usuarios Activos', { align: 'center' });
        doc.moveDown(2);

        // Función para formatear fechas a dd/mm/aaaa
        const formatFecha = (fecha) => {
            if (!fecha) return 'Actualmente laborando';
            const date = new Date(fecha);
            return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
        };

        // Añadir encabezados de la tabla
        doc.fontSize(12).fillColor('black')
            .text('ID Usuario', 50, 160, { width: 60, align: 'left' })
            .text('Usuario', 120, 160, { width: 80, align: 'left' })
            .text('DPI', 210, 160, { width: 80, align: 'left' })
            .text('Nombre', 300, 160, { width: 80, align: 'left' })
            .text('Apellido', 390, 160, { width: 80, align: 'left' })
            .text('Teléfono', 480, 160, { width: 80, align: 'left' })
            .moveTo(45, 175).lineTo(555, 175).stroke(); // Línea bajo los encabezados

        // Añadir los datos de cada usuario activo en la tabla
        let yPosition = 185;
        results.forEach(usuario => {
            doc.fontSize(10).fillColor('black')
                .text(usuario.idUsuario, 50, yPosition, { width: 60, align: 'left' })
                .text(usuario.user, 120, yPosition, { width: 80, align: 'left' })
                .text(usuario.dpi, 210, yPosition, { width: 80, align: 'left' })
                .text(usuario.nombre, 300, yPosition, { width: 80, align: 'left' })
                .text(usuario.apellido, 390, yPosition, { width: 80, align: 'left' })
                .text(usuario.telefono, 480, yPosition, { width: 80, align: 'left' });
            
            // Añadir una nueva línea por cada usuario
            yPosition += 20;

            // Si la posición Y es mayor a 720, crear una nueva página
            if (yPosition > 720) {
                doc.addPage();
                yPosition = 50;
            }
        });

        // Finalizar el PDF
        doc.end();
    });
});



// Ruta para generar el reporte en PDF de todos los usuarios inactivos
app.get('/admin/usuarioReporteInactivo', (req, res) => {

    // Consulta para obtener todos los usuarios activos
    const queryUsuariosActivos = `
        SELECT u.idUsuario, u.user, u.estado_usuario_idEstadoUsuario, e.dpi, e.nombre, e.apellido, e.telefono, e.direccion, e.puesto, e.sueldo, e.fechaContratacion, e.fechaDespido
        FROM usuario u
        JOIN empleado e ON u.idUsuario = e.idEmpleado
        WHERE u.estado_usuario_idEstadoUsuario = 2;
    `;

    conexion.query(queryUsuariosActivos, (error, results) => {
        if (error) {
            console.log(error);
            return res.status(500).send('Error al obtener los datos de los usuarios.');
        }

        if (results.length === 0) {
            return res.status(404).send('No se encontraron usuarios activos.');
        }

        // Crear un documento PDF
        const doc = new PDFDocument({ margin: 30 });
        res.setHeader('Content-Disposition', 'attachment; filename=reporte_usuarios_inactivos.pdf');
        res.setHeader('Content-Type', 'application/pdf');
        doc.pipe(res);

        // Ruta del logo de la empresa
        const logoPath = path.join(__dirname, '/public/img/logo.jpg'); // Ajusta esta ruta según la ubicación de tu logo
        
        // Agregar el logo y la información de la empresa
        doc.image(logoPath, { width: 80, align: 'center' })
            .fontSize(20)
            .text('Serviautos Jas', { align: 'center' })
            .moveDown();

        // Título del reporte
        doc.fontSize(18).text('Reporte de Usuarios Inactivos', { align: 'center' });
        doc.moveDown(2);

        // Función para formatear fechas a dd/mm/aaaa
        const formatFecha = (fecha) => {
            if (!fecha) return 'Actualmente laborando';
            const date = new Date(fecha);
            return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
        };

        // Añadir encabezados de la tabla
        doc.fontSize(12).fillColor('black')
            .text('ID Usuario', 50, 160, { width: 60, align: 'left' })
            .text('Usuario', 120, 160, { width: 80, align: 'left' })
            .text('DPI', 210, 160, { width: 80, align: 'left' })
            .text('Nombre', 300, 160, { width: 80, align: 'left' })
            .text('Apellido', 390, 160, { width: 80, align: 'left' })
            .text('Teléfono', 480, 160, { width: 80, align: 'left' })
            .moveTo(45, 175).lineTo(555, 175).stroke(); // Línea bajo los encabezados

        // Añadir los datos de cada usuario activo en la tabla
        let yPosition = 185;
        results.forEach(usuario => {
            doc.fontSize(10).fillColor('black')
                .text(usuario.idUsuario, 50, yPosition, { width: 60, align: 'left' })
                .text(usuario.user, 120, yPosition, { width: 80, align: 'left' })
                .text(usuario.dpi, 210, yPosition, { width: 80, align: 'left' })
                .text(usuario.nombre, 300, yPosition, { width: 80, align: 'left' })
                .text(usuario.apellido, 390, yPosition, { width: 80, align: 'left' })
                .text(usuario.telefono, 480, yPosition, { width: 80, align: 'left' });
            
            // Añadir una nueva línea por cada usuario
            yPosition += 45;

            // Si la posición Y es mayor a 720, crear una nueva página
            if (yPosition > 720) {
                doc.addPage();
                yPosition = 50;
            }
        });

        // Finalizar el PDF
        doc.end();
    });
});


app.get('/admin/usuarioReporteSesiones/:idUsuario', (req, res) => {
    const idUsuario = req.params.idUsuario;

    // Consulta para obtener los datos del usuario y sus inicios de sesión
    const queryUsuarioSesiones = `
        SELECT u.user, e.nombre, e.apellido, rs.fecha_hora_inicio
        FROM usuario u
        JOIN empleado e ON u.idUsuario = e.idEmpleado
        JOIN registro_sesiones rs ON u.idUsuario = rs.usuario_idUsuario
        WHERE u.idUsuario = ?;
    `;

    conexion.query(queryUsuarioSesiones, [idUsuario], (error, results) => {
        if (error) {
            console.log(error);
            return res.status(500).json({ success: false, message: 'Error al obtener los datos de los inicios de sesión.' });
        }

        if (results.length === 0) {
            return res.status(404).json({ success: false, message: 'No se encontraron registros de inicios de sesión para este usuario.' });
        }

        // Crear un documento PDF
        const doc = new PDFDocument({ margin: 30 });
        res.setHeader('Content-Disposition', `attachment; filename=reporte_sesiones_usuario_${idUsuario}.pdf`);
        res.setHeader('Content-Type', 'application/pdf');
        doc.pipe(res);

        // Ruta del logo de la empresa
        const logoPath = path.join(__dirname, '/public/img/logo.jpg'); // Ajusta esta ruta según la ubicación de tu logo

        // Agregar el logo y la información de la empresa
        doc.image(logoPath, { width: 80, align: 'center' })
            .fontSize(20)
            .text('Serviautos Jas', { align: 'center' })
            .moveDown();

        // Título del reporte
        doc.fontSize(18).text('Reporte de Inicios de Sesión del Usuario', { align: 'center' });
        doc.moveDown(2);

        // Mostrar detalles del usuario (solo una vez, ya que es el mismo para todas las sesiones)
        const usuario = results[0];
        doc.fontSize(12)
            .text(`Usuario: ${usuario.user}`, { align: 'left' })
            .text(`Nombre: ${usuario.nombre}`, { align: 'left' })
            .text(`Apellido: ${usuario.apellido}`, { align: 'left' })
            .moveDown(2);

        // Añadir encabezados de la tabla
        doc.fontSize(12).fillColor('black')
            .text('Fecha y Hora de Inicio de Sesión', 100, 180, { width: 400, align: 'center' })
            .moveTo(45, 195).lineTo(555, 195).stroke(); // Línea bajo los encabezados

        // Añadir los datos de cada inicio de sesión
        let yPosition = 210;
        results.forEach(sesion => {
            doc.fontSize(10).fillColor('black')
                .text(sesion.fecha_hora_inicio, 100, yPosition, { width: 400, align: 'center' });
            
            // Añadir una nueva línea por cada inicio de sesión
            yPosition += 45;

            // Si la posición Y es mayor a 720, crear una nueva página
            if (yPosition > 720) {
                doc.addPage();
                yPosition = 50;
            }
        });

        // Finalizar el PDF
        doc.end();
    });
});




const usuarioCrud = require('./views/admin/controllers/usuarioCrud');
app.post('/saveUsuario', usuarioCrud.saveUsuario);
app.post('/updateUsuario', usuarioCrud.updateUsuario);
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////






////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///empleado



app.get('/admin/empleado', (req, res) => {
    const { nombre = '', puesto = '', telefono = '', pagina = 1 } = req.query;

    const registrosPorPagina = 4;
    const offset = (pagina - 1) * registrosPorPagina;

    // Consulta con filtros dinámicos para obtener empleados con paginación
    let query = `
        SELECT e.idEmpleado, e.nombre, e.apellido, e.telefono, e.puesto
        FROM empleado e
        JOIN usuario u ON e.idEmpleado = u.idUsuario
        WHERE u.estado_usuario_idEstadoUsuario = 1
    `;

    // Agregar filtros a la consulta si existen
    if (nombre) {
        query += ` AND e.nombre LIKE '%${nombre}%'`;
    }
    if (puesto) {
        query += ` AND e.puesto LIKE '%${puesto}%'`;
    }
    if (telefono) {
        query += ` AND e.telefono LIKE '%${telefono}%'`;
    }

    // Agregar la paginación
    query += ` LIMIT ${registrosPorPagina} OFFSET ${offset}`;

    conexion.query(query, (err, results) => {
        if (err) {
            console.error('Error al obtener los empleados:', err);
            return res.status(500).send('Error en el servidor');
        }

        // Consulta para obtener el total de registros filtrados
        let totalQuery = `
            SELECT COUNT(*) as total 
            FROM empleado e
            JOIN usuario u ON e.idEmpleado = u.idUsuario
            WHERE u.estado_usuario_idEstadoUsuario = 1
        `;

        // Aplicar los mismos filtros a la consulta de total de registros
        if (nombre) {
            totalQuery += ` AND e.nombre LIKE '%${nombre}%'`;
        }
        if (puesto) {
            totalQuery += ` AND e.puesto LIKE '%${puesto}%'`;
        }
        if (telefono) {
            totalQuery += ` AND e.telefono LIKE '%${telefono}%'`;
        }

        conexion.query(totalQuery, (err, totalResults) => {
            if (err) {
                console.error('Error al obtener el total de empleados:', err);
                return res.status(500).send('Error en el servidor');
            }

            const totalRegistros = totalResults[0].total;
            const totalPaginas = Math.ceil(totalRegistros / registrosPorPagina);

            // Renderizar la vista con los resultados filtrados
            res.render('admin/empleado', {
                results,
                paginaActual: parseInt(pagina, 10),
                totalPaginas,
                nombre, // Mantén los valores de los filtros para que persistan
                puesto,
                telefono
            });
        });
    });
});






app.get('/admin/empleadoEdit/:idUsuario', (req, res) => {    
    const idUsuario = req.params.idUsuario;

    // Primero, selecciona los datos del usuario
    conexion.query('SELECT * FROM usuario WHERE idUsuario = ?', [idUsuario], (error, results) => {
        if (error) {
            throw error;
        } else {
            // Verifica si el usuario existe antes de hacer la segunda consulta
            if (results.length > 0) {
                const usuario = results[0];
                const idEmpleado = usuario.idUsuario; // Ajusta según el nombre del campo correcto si es diferente

                // Luego, selecciona los datos del empleado relacionado
                conexion.query('SELECT * FROM empleado WHERE idEmpleado = ?', [idEmpleado], (error, empleadoResults) => {
                    if (error) {
                        throw error;
                    } else {
                        // Renderiza la vista con los datos tanto del usuario como del empleado
                        res.render('admin/empleadoEdit', {
                            usuario: usuario,
                            empleado: empleadoResults[0] // Ajusta según lo que necesites mostrar
                        });
                    }
                });
            } else {
                res.status(404).send('Usuario no encontrado');
            }
        }
    });
});







app.get('/admin/empleadoCreate',(req, res)=>{
    res.render('admin/empleadoCreate');
})



app.get('/admin/empleadoDelete/:idEmpleado', (req, res) => {
    const idEmpleado = req.params.idEmpleado;

    // Obtener la fecha actual del sistema en formato YYYY-MM-DD
    const fechaDespido = moment().format('YYYY-MM-DD HH:mm:ss');
    
    // Actualizar el estado del usuario a 2 (desactivado) en la tabla usuario
    const updateUsuarioQuery = 'UPDATE usuario SET estado_usuario_idEstadoUsuario = 2 WHERE idUsuario = ?';
    
    conexion.query(updateUsuarioQuery, [idEmpleado], (error, results) => {
        if (error) {
            console.log(error);
            return res.status(500).send('Error actualizando el estado del usuario.');
        }

        // Actualizar la fecha de despido en la tabla empleado
        const updateEmpleadoQuery = 'UPDATE empleado SET fechaDespido = ? WHERE idEmpleado = ?';
        
        conexion.query(updateEmpleadoQuery, [fechaDespido, idEmpleado], (error, results) => {
            if (error) {
                console.log(error);
                return res.status(500).send('Error actualizando la fecha de despido del empleado.');
            }

            // Redirigir a la vista de empleados tras la actualización
            res.redirect('/admin/empleado');
        });
    });
});


app.get('/admin/empleadoReporte/:idEmpleado', (req, res) => {
    const idEmpleado = req.params.idEmpleado;

    // Consulta para obtener los datos del empleado
    const queryEmpleado = `
        SELECT e.idEmpleado, e.dpi, e.nombre, e.apellido, e.telefono, e.direccion, e.puesto, e.sueldo, e.fechaNac, e.fechaContratacion, e.fechaDespido,
               u.user, u.estado_usuario_idEstadoUsuario
        FROM empleado e
        JOIN usuario u ON e.idEmpleado = u.idUsuario
        WHERE e.idEmpleado = ?;
    `;

    conexion.query(queryEmpleado, [idEmpleado], (error, results) => {
        if (error) {
            console.log(error);
            return res.status(500).send('Error al obtener los datos del empleado.');
        }

        if (results.length === 0) {
            return res.status(404).send('Empleado no encontrado.');
        }

        const empleado = results[0];

        const formatFecha = (fecha) => {
            if (!fecha) return 'Actualmente laborando';
            const date = new Date(fecha);
            return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
        };

        // Crear un documento PDF
        const doc = new PDFDocument();
        res.setHeader('Content-Disposition', 'attachment; filename=reporte_' + empleado.nombre + '_' + empleado.apellido + '.pdf');
        res.setHeader('Content-Type', 'application/pdf');
        doc.pipe(res);

        // Ruta del logo de la empresa
        const logoPath = path.join(__dirname, '/public/img/logo.jpg'); // Ajusta esta ruta según la ubicación de tu logo
        
        // Agregar el logo y la información de la empresa
        doc.image(logoPath, { align: 'center', width: 100 }) // Ajusta las dimensiones y la posición según sea necesario
           .fontSize(20)
           .text('Serviautos Jas', { align: 'center' }) // Ajusta el nombre y la posición según sea necesario
           .moveDown();

        // Agregar título y detalles del empleado
        doc.fontSize(18).text('Reporte de Empleado', { align: 'center' });
        doc.moveDown();
        doc.moveDown();

        doc.fontSize(12).text(`ID Empleado: ${empleado.idEmpleado}`);
        doc.text(`Usuario: ${empleado.user}`);

        // Mostrar "Activo" o "Inactivo" según el estado
        const estadoUsuario = empleado.estado_usuario_idEstadoUsuario === 1 ? 'Activo' : 'Inactivo';
        doc.text(`Estado Usuario: ${estadoUsuario}`);
        
        doc.moveDown();
        doc.fontSize(14).text('Datos del Empleado:', { underline: true });
        doc.fontSize(12).text(`DPI: ${empleado.dpi}`);
        doc.text(`Nombre: ${empleado.nombre}`);
        doc.text(`Apellido: ${empleado.apellido}`);
        doc.text(`Teléfono: ${empleado.telefono}`);
        doc.text(`Dirección: ${empleado.direccion}`);
        doc.text(`Puesto: ${empleado.puesto}`);
        doc.text(`Sueldo: Q. ${empleado.sueldo}`);
        doc.text(`Fecha de Nacimiento: ${formatFecha(empleado.fechaNac)}`);
        doc.text(`Fecha de Contratación: ${formatFecha(empleado.fechaContratacion)}`);
        doc.text(`Fecha de Despido: ${formatFecha(empleado.fechaDespido) || 'Actualmente laborando'}`);

        // Finalizar el PDF
        doc.end();
    });
});




// Ruta para generar el reporte en PDF de todos los usuarios activos
app.get('/admin/empleadoReporteActivo', (req, res) => {

    // Consulta para obtener todos los usuarios activos
    const queryUsuariosActivos = `
        SELECT u.idUsuario, u.user, u.estado_usuario_idEstadoUsuario, e.dpi, e.nombre, e.apellido, e.telefono, e.direccion, e.puesto, e.sueldo, e.fechaContratacion, e.fechaDespido
        FROM usuario u
        JOIN empleado e ON u.idUsuario = e.idEmpleado
        WHERE u.estado_usuario_idEstadoUsuario = 1;
    `;

    conexion.query(queryUsuariosActivos, (error, results) => {
        if (error) {
            console.log(error);
            return res.status(500).send('Error al obtener los datos de los empleados.');
        }

        if (results.length === 0) {
            return res.status(404).send('No se encontraron empleados activos.');
        }

        // Crear un documento PDF
        const doc = new PDFDocument({ margin: 30 });
        res.setHeader('Content-Disposition', 'attachment; filename=reporte_empleados_activos.pdf');
        res.setHeader('Content-Type', 'application/pdf');
        doc.pipe(res);

        // Ruta del logo de la empresa
        const logoPath = path.join(__dirname, '/public/img/logo.jpg'); // Ajusta esta ruta según la ubicación de tu logo
        
        // Agregar el logo y la información de la empresa
        doc.image(logoPath, { width: 80, align: 'center' })
            .fontSize(20)
            .text('Serviautos Jas', { align: 'center' })
            .moveDown();

        // Título del reporte
        doc.fontSize(18).text('Reporte de Empleados Activos', { align: 'center' });
        doc.moveDown(2);

        // Función para formatear fechas a dd/mm/aaaa
        const formatFecha = (fecha) => {
            if (!fecha) return 'Actualmente laborando';
            const date = new Date(fecha);
            return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
        };

        // Añadir encabezados de la tabla
        doc.fontSize(12).fillColor('black')
            .text('ID Usuario', 50, 160, { width: 60, align: 'left' })
            .text('Usuario', 120, 160, { width: 80, align: 'left' })
            .text('DPI', 210, 160, { width: 80, align: 'left' })
            .text('Nombre', 300, 160, { width: 80, align: 'left' })
            .text('Apellido', 390, 160, { width: 80, align: 'left' })
            .text('Teléfono', 480, 160, { width: 80, align: 'left' })
            .moveTo(45, 175).lineTo(555, 175).stroke(); // Línea bajo los encabezados

        // Añadir los datos de cada usuario activo en la tabla
        let yPosition = 185;
        results.forEach(usuario => {
            doc.fontSize(10).fillColor('black')
                .text(usuario.idUsuario, 50, yPosition, { width: 60, align: 'left' })
                .text(usuario.user, 120, yPosition, { width: 80, align: 'left' })
                .text(usuario.dpi, 210, yPosition, { width: 80, align: 'left' })
                .text(usuario.nombre, 300, yPosition, { width: 80, align: 'left' })
                .text(usuario.apellido, 390, yPosition, { width: 80, align: 'left' })
                .text(usuario.telefono, 480, yPosition, { width: 80, align: 'left' });
            
            // Añadir una nueva línea por cada usuario
            yPosition += 45;

            // Si la posición Y es mayor a 720, crear una nueva página
            if (yPosition > 720) {
                doc.addPage();
                yPosition = 50;
            }
        });

        // Finalizar el PDF
        doc.end();
    });
});



// Ruta para generar el reporte en PDF de todos los usuarios inactivos
app.get('/admin/empleadoReporteInactivo', (req, res) => {

    // Consulta para obtener todos los usuarios activos
    const queryUsuariosActivos = `
        SELECT u.idUsuario, u.user, u.estado_usuario_idEstadoUsuario, e.dpi, e.nombre, e.apellido, e.telefono, e.direccion, e.puesto, e.sueldo, e.fechaContratacion, e.fechaDespido
        FROM usuario u
        JOIN empleado e ON u.idUsuario = e.idEmpleado
        WHERE u.estado_usuario_idEstadoUsuario = 2;
    `;

    conexion.query(queryUsuariosActivos, (error, results) => {
        if (error) {
            console.log(error);
            return res.status(500).send('Error al obtener los datos de los empleados.');
        }

        if (results.length === 0) {
            return res.status(404).send('No se encontraron empleados activos.');
        }

        // Crear un documento PDF
        const doc = new PDFDocument({ margin: 30 });
        res.setHeader('Content-Disposition', 'attachment; filename=reporte_empleados_inactivos.pdf');
        res.setHeader('Content-Type', 'application/pdf');
        doc.pipe(res);

        // Ruta del logo de la empresa
        const logoPath = path.join(__dirname, '/public/img/logo.jpg'); // Ajusta esta ruta según la ubicación de tu logo
        
        // Agregar el logo y la información de la empresa
        doc.image(logoPath, { width: 80, align: 'center' })
            .fontSize(20)
            .text('Serviautos Jas', { align: 'center' })
            .moveDown();

        // Título del reporte
        doc.fontSize(18).text('Reporte de Empleados Inactivos', { align: 'center' });
        doc.moveDown(2);

        // Función para formatear fechas a dd/mm/aaaa
        const formatFecha = (fecha) => {
            if (!fecha) return 'Actualmente laborando';
            const date = new Date(fecha);
            return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
        };

        // Añadir encabezados de la tabla
        doc.fontSize(12).fillColor('black')
            .text('ID Usuario', 50, 160, { width: 60, align: 'left' })
            .text('Usuario', 120, 160, { width: 80, align: 'left' })
            .text('DPI', 210, 160, { width: 80, align: 'left' })
            .text('Nombre', 300, 160, { width: 80, align: 'left' })
            .text('Apellido', 390, 160, { width: 80, align: 'left' })
            .text('Teléfono', 480, 160, { width: 80, align: 'left' })
            .moveTo(45, 175).lineTo(555, 175).stroke(); // Línea bajo los encabezados

        // Añadir los datos de cada usuario activo en la tabla
        let yPosition = 185;
        results.forEach(usuario => {
            doc.fontSize(10).fillColor('black')
                .text(usuario.idUsuario, 50, yPosition, { width: 60, align: 'left' })
                .text(usuario.user, 120, yPosition, { width: 80, align: 'left' })
                .text(usuario.dpi, 210, yPosition, { width: 80, align: 'left' })
                .text(usuario.nombre, 300, yPosition, { width: 80, align: 'left' })
                .text(usuario.apellido, 390, yPosition, { width: 80, align: 'left' })
                .text(usuario.telefono, 480, yPosition, { width: 80, align: 'left' });
            
            // Añadir una nueva línea por cada usuario
            yPosition += 45;

            // Si la posición Y es mayor a 720, crear una nueva página
            if (yPosition > 720) {
                doc.addPage();
                yPosition = 50;
            }
        });

        // Finalizar el PDF
        doc.end();
    });
});









const empleadoCrud = require('./views/admin/controllers/empleadoCrud');
app.post('/saveEmpleado', empleadoCrud.saveEmpleado);
app.post('/updateEmpleado', empleadoCrud.updateEmpleado);
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

//aca empieza categoria 
//ver tabla y paginacion
app.get('/admin/categoria', (req, res) => {
    const { nombre = '', descripcion = '', pagina = 1 } = req.query;

    const registrosPorPagina = 4;
    const offset = (pagina - 1) * registrosPorPagina;

    // Consulta con filtros dinámicos para obtener categorías con paginación
    let query = `
        SELECT c.idCategoria, c.nombre, c.descripcion
        FROM categoria c
        WHERE 1=1
    `;

    // Agregar filtros a la consulta si existen
    if (nombre) {
        query += ` AND c.nombre LIKE '%${nombre}%'`;
    }
    if (descripcion) {
        query += ` AND c.descripcion LIKE '%${descripcion}%'`;
    }

    // Agregar la paginación
    query += ` LIMIT ${registrosPorPagina} OFFSET ${offset}`;

    conexion.query(query, (err, results) => {
        if (err) {
            console.error('Error al obtener las categorías:', err);
            return res.status(500).send('Error en el servidor');
        }

        // Consulta para obtener el total de registros filtrados
        let totalQuery = `
            SELECT COUNT(*) as total 
            FROM categoria c
            WHERE 1=1
        `;

        // Aplicar los mismos filtros a la consulta de total de registros
        if (nombre) {
            totalQuery += ` AND c.nombre LIKE '%${nombre}%'`;
        }
        if (descripcion) {
            totalQuery += ` AND c.descripcion LIKE '%${descripcion}%'`;
        }

        conexion.query(totalQuery, (err, totalResults) => {
            if (err) {
                console.error('Error al obtener el total de categorías:', err);
                return res.status(500).send('Error en el servidor');
            }

            const totalRegistros = totalResults[0].total;
            const totalPaginas = Math.ceil(totalRegistros / registrosPorPagina);

            // Renderizar la vista con los resultados filtrados
            res.render('admin/categoria', {
                results,
                paginaActual: parseInt(pagina, 10),
                totalPaginas,
                nombre, // Mantén los valores de los filtros para que persistan
                descripcion
            });
        });
    });
});



//crear
app.get('/admin/categoriaCreate',(req, res)=>{
    res.render('admin/categoriaCreate');
})


//edit para cargar los datos a los inputs

app.get('/admin/categoriaEdit/:idCategoria', (req, res) => {    
    const idCategoria = req.params.idCategoria;

    // Selecciona los datos de la categoría
    conexion.query('SELECT * FROM categoria WHERE idCategoria = ?', [idCategoria], (error, results) => {
        if (error) {
            throw error;
        } else {
            // Verifica si la categoría existe
            if (results.length > 0) {
                const categoria = results[0];

                // Renderiza la vista con los datos de la categoría
                res.render('admin/categoriaEdit', {
                    categoria: categoria // Enviar los datos de la categoría a la vista
                });
            } else {
                res.status(404).send('Categoría no encontrada');
            }
        }
    });
});

//eliminar categoria


app.get('/admin/categoriaDelete/:idCategoria', (req, res) => {
    const idCategoria = req.params.idCategoria;

    // Consulta para eliminar la categoría de la tabla
    const deleteCategoriaQuery = 'DELETE FROM categoria WHERE idCategoria = ?';
    
    // Ejecutar la consulta de eliminación
    conexion.query(deleteCategoriaQuery, [idCategoria], (error, results) => {
        if (error) {
            console.log(error);
            return res.status(500).send('Error eliminando la categoría.');
        }

        // Redirigir a la vista de categorías tras la eliminación
        res.redirect('/admin/categoria');
    });
});



//actividades desde el crud categoria

const categoriaCrud = require('./views/admin/controllers/categoriaCrud');
app.post('/saveCategoria', categoriaCrud.saveCategoria);
app.post('/updateCategoria', categoriaCrud.updateCategoria);


//reportes

app.get('/admin/categoriaReporte/:idCategoria', (req, res) => {
    const idCategoria = req.params.idCategoria;

    // Consulta para obtener los datos de la categoría
    const queryCategoria = `
        SELECT *
        FROM categoria 
        WHERE idCategoria = ?;
    `;

    conexion.query(queryCategoria, [idCategoria], (error, results) => {
        if (error) {
            console.log(error);
            return res.status(500).send('Error al obtener los datos de la categoría.');
        }

        if (results.length === 0) {
            return res.status(404).send('Categoría no encontrada.');
        }

        const categoria = results[0];

        // Crear un documento PDF
        const doc = new PDFDocument();
        // Headers correctos para forzar la descarga
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="reporte_categoria_' + categoria.nombre + '.pdf"');

        doc.pipe(res);

        // Ruta del logo de la empresa
        const logoPath = path.join(__dirname, '/public/img/logo.jpg'); // Ajusta esta ruta según la ubicación de tu logo
        
        // Agregar el logo y la información de la empresa
        doc.image(logoPath, { align: 'center', width: 100 }) // Ajusta las dimensiones y la posición según sea necesario
           .fontSize(20)
           .text('Serviautos Jas', { align: 'center' }) // Ajusta el nombre y la posición según sea necesario
           .moveDown();

        // Agregar título y detalles de la categoría
        doc.fontSize(18).text('Reporte de Categoría', { align: 'center' });
        doc.moveDown();
        doc.moveDown();

        doc.fontSize(12).text(`ID Categoría: ${categoria.idCategoria}`);
        doc.text(`Nombre: ${categoria.nombre}`);
        const descripcionLimpia = categoria.descripcion.trim();
        doc.text(`Descripción: ${descripcionLimpia}`);

        // Finalizar el PDF
        doc.end();
    });
});


//reporte para todas las categorias

app.get('/admin/categoriaReporteTodos', (req, res) => {
    // Consulta para obtener todos los datos de las categorías
    const queryCategorias = `
        SELECT *
        FROM categoria;
    `;

    conexion.query(queryCategorias, (error, results) => {
        if (error) {
            console.log(error);
            return res.status(500).send('Error al obtener los datos de las categorías.');
        }

        if (results.length === 0) {
            return res.status(404).send('No se encontraron categorías.');
        }

        // Crear un documento PDF
        const doc = new PDFDocument();
        // Headers correctos para forzar la descarga
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="reporte_todas_categorias.pdf"');

        doc.pipe(res);

        // Ruta del logo de la empresa
        const logoPath = path.join(__dirname, '/public/img/logo.jpg'); // Ajusta esta ruta según la ubicación de tu logo
        
        // Agregar el logo y la información de la empresa
        doc.image(logoPath, { align: 'center', width: 100 }) // Ajusta las dimensiones y la posición según sea necesario
           .fontSize(20)
           .text('Serviautos Jas', { align: 'center' }) // Ajusta el nombre y la posición según sea necesario
           .moveDown();

        // Agregar título y detalles de todas las categorías
        doc.fontSize(18).text('Reporte de Todas las Categorías', { align: 'center' });
        doc.moveDown();
        doc.moveDown();

        // Agregar los detalles de cada categoría
        results.forEach(categoria => {
            doc.fontSize(14).text(`ID Categoría: ${categoria.idCategoria}`, { underline: true });
            doc.fontSize(12).text(`Nombre: ${categoria.nombre}`);
            doc.text(`Descripción: ${categoria.descripcion.trim()}`);
            doc.moveDown(); // Añadir un espacio entre categorías
        });

        // Finalizar el PDF
        doc.end();
    });
});

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

//aca empieza marca

app.get('/admin/marca', (req, res) => {
    const { nombre = '', pagina = 1 } = req.query;

    const registrosPorPagina = 4;
    const offset = (pagina - 1) * registrosPorPagina;

    // Consulta con filtros dinámicos para obtener marcas con paginación
    let query = `
        SELECT m.idMarca, m.nombre
        FROM marca m
        WHERE 1=1
    `;

    // Agregar filtros a la consulta si existen
    if (nombre) {
        query += ` AND m.nombre LIKE '%${nombre}%'`;
    }

    // Agregar la paginación
    query += ` LIMIT ${registrosPorPagina} OFFSET ${offset}`;

    conexion.query(query, (err, results) => {
        if (err) {
            console.error('Error al obtener las marcas:', err);
            return res.status(500).send('Error en el servidor');
        }

        // Consulta para obtener el total de registros filtrados
        let totalQuery = `
            SELECT COUNT(*) as total 
            FROM marca m
            WHERE 1=1
        `;

        // Aplicar los mismos filtros a la consulta de total de registros
        if (nombre) {
            totalQuery += ` AND m.nombre LIKE '%${nombre}%'`;
        }

        conexion.query(totalQuery, (err, totalResults) => {
            if (err) {
                console.error('Error al obtener el total de marcas:', err);
                return res.status(500).send('Error en el servidor');
            }

            const totalRegistros = totalResults[0].total;
            const totalPaginas = Math.ceil(totalRegistros / registrosPorPagina);

            // Renderizar la vista con los resultados filtrados
            res.render('admin/marca', {
                results,
                paginaActual: parseInt(pagina, 10),
                totalPaginas,
                nombre // Mantén los valores de los filtros para que persistan
            });
        });
    });
});


//crear
app.get('/admin/marcaCreate',(req, res)=>{
    res.render('admin/marcaCreate');
})



//actividades desde el crud marca

const marcaCrud = require('./views/admin/controllers/marcaCrud');
app.post('/saveMarca', marcaCrud.saveMarca);
app.post('/updateMarca', marcaCrud.updateMarca);

//edit para cargar los inputs

app.get('/admin/marcaEdit/:idMarca', (req, res) => {    
    const idMarca = req.params.idMarca;

    // Selecciona los datos de la marca
    conexion.query('SELECT * FROM marca WHERE idMarca = ?', [idMarca], (error, results) => {
        if (error) {
            throw error;
        } else {
            // Verifica si la marca existe
            if (results.length > 0) {
                const marca = results[0];

                // Renderiza la vista con los datos de la marca
                res.render('admin/marcaEdit', {
                    marca: marca // Enviar los datos de la marca a la vista
                });
            } else {
                res.status(404).send('Marca no encontrada');
            }
        }
    });
});


// para eliminar

app.get('/admin/marcaDelete/:idMarca', (req, res) => {
    const idMarca = req.params.idMarca;

    // Consulta para eliminar la marca de la tabla
    const deleteMarcaQuery = 'DELETE FROM marca WHERE idMarca = ?';
    
    // Ejecutar la consulta de eliminación
    conexion.query(deleteMarcaQuery, [idMarca], (error, results) => {
        if (error) {
            console.log(error);
            return res.status(500).send('Error eliminando la marca.');
        }

        // Redirigir a la vista de marcas tras la eliminación
        res.redirect('/admin/marca');
    });
});

// Reportes

app.get('/admin/marcaReporte/:idMarca', (req, res) => {
    const idMarca = req.params.idMarca;

    // Consulta para obtener los datos de la marca
    const queryMarca = `
        SELECT *
        FROM marca 
        WHERE idMarca = ?;
    `;

    conexion.query(queryMarca, [idMarca], (error, results) => {
        if (error) {
            console.log(error);
            return res.status(500).send('Error al obtener los datos de la marca.');
        }

        if (results.length === 0) {
            return res.status(404).send('Marca no encontrada.');
        }

        const marca = results[0];

        // Crear un documento PDF
        const doc = new PDFDocument();
        // Headers correctos para forzar la descarga
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="reporte_marca_' + marca.nombre + '.pdf"');

        doc.pipe(res);

        // Ruta del logo de la empresa
        const logoPath = path.join(__dirname, '/public/img/logo.jpg'); // Ajusta esta ruta según la ubicación de tu logo
        
        // Agregar el logo y la información de la empresa
        doc.image(logoPath, { align: 'center', width: 100 }) // Ajusta las dimensiones y la posición según sea necesario
           .fontSize(20)
           .text('Serviautos Jas', { align: 'center' }) // Ajusta el nombre y la posición según sea necesario
           .moveDown();

        // Agregar título y detalles de la marca
        doc.fontSize(18).text('Reporte de Marca', { align: 'center' });
        doc.moveDown();
        doc.moveDown();

        doc.fontSize(12).text(`ID Marca: ${marca.idMarca}`);
        doc.text(`Nombre: ${marca.nombre}`);

        // Finalizar el PDF
        doc.end();
    });
});

// Reporte para todas las marcas

app.get('/admin/marcaReporteTodos', (req, res) => {
    // Consulta para obtener todos los datos de las marcas
    const queryMarcas = `
        SELECT *
        FROM marca;
    `;

    conexion.query(queryMarcas, (error, results) => {
        if (error) {
            console.log(error);
            return res.status(500).send('Error al obtener los datos de las marcas.');
        }

        if (results.length === 0) {
            return res.status(404).send('No se encontraron marcas.');
        }

        // Crear un documento PDF
        const doc = new PDFDocument();
        // Headers correctos para forzar la descarga
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="reporte_todas_marcas.pdf"');

        doc.pipe(res);

        // Ruta del logo de la empresa
        const logoPath = path.join(__dirname, '/public/img/logo.jpg'); // Ajusta esta ruta según la ubicación de tu logo
        
        // Agregar el logo y la información de la empresa
        doc.image(logoPath, { align: 'center', width: 100 }) // Ajusta las dimensiones y la posición según sea necesario
           .fontSize(20)
           .text('Serviautos Jas', { align: 'center' }) // Ajusta el nombre y la posición según sea necesario
           .moveDown();

        // Agregar título y detalles de todas las marcas
        doc.fontSize(18).text('Reporte de Todas las Marcas', { align: 'center' });
        doc.moveDown();
        doc.moveDown();

        // Agregar los detalles de cada marca
        results.forEach(marca => {
            doc.fontSize(14).text(`ID Marca: ${marca.idMarca}`, { underline: true });
            doc.fontSize(12).text(`Nombre: ${marca.nombre}`);
            doc.moveDown(); // Añadir un espacio entre marcas
        });

        // Finalizar el PDF
        doc.end();
    });
});

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

//proveedor

app.get('/admin/proveedor', (req, res) => {
    const { nombre = '', telefono = '', estado = '', pagina = 1 } = req.query;

    const registrosPorPagina = 4;
    const offset = (pagina - 1) * registrosPorPagina;

    // Consulta con filtros dinámicos para obtener proveedores
    let query = `
        SELECT 
            p.*, 
            e.nombre AS nombreEstado 
        FROM proveedor p
        LEFT JOIN estado_proveedor e ON p.estado_proveedor_idEstadoProveedor = e.idEstadoProveedor
        WHERE 1=1
    `;

    // Agregar filtros a la consulta si existen
    if (nombre) {
        query += ` AND p.nombre LIKE '%${nombre}%'`;
    }
    if (telefono) {
        query += ` AND p.telefono LIKE '%${telefono}%'`;
    }
    if (estado) {
        query += ` AND e.nombre LIKE '%${estado}%'`;
    }

    // Agregar la paginación
    query += ` LIMIT ${registrosPorPagina} OFFSET ${offset}`;

    conexion.query(query, (err, results) => {
        if (err) {
            console.error('Error al obtener los proveedores:', err);
            return res.status(500).send('Error en el servidor');
        }

        // Consulta para obtener el total de registros filtrados
        let totalQuery = `
            SELECT COUNT(*) as total 
            FROM proveedor p
            LEFT JOIN estado_proveedor e ON p.estado_proveedor_idEstadoProveedor = e.idEstadoProveedor
            WHERE 1=1
        `;

        // Aplicar los mismos filtros a la consulta de total de registros
        if (nombre) {
            totalQuery += ` AND p.nombre LIKE '%${nombre}%'`;
        }
        if (telefono) {
            totalQuery += ` AND p.telefono LIKE '%${telefono}%'`;
        }
        if (estado) {
            totalQuery += ` AND e.nombre LIKE '%${estado}%'`;
        }

        conexion.query(totalQuery, (err, totalResults) => {
            if (err) {
                console.error('Error al obtener el total de proveedores:', err);
                return res.status(500).send('Error en el servidor');
            }

            const totalRegistros = totalResults[0].total;
            const totalPaginas = Math.ceil(totalRegistros / registrosPorPagina);

            // Renderizar la vista con los resultados filtrados
            res.render('admin/proveedor', {
                results,
                paginaActual: parseInt(pagina, 10),
                totalPaginas,
                nombre, // Mantén los valores de los filtros para que persistan
                telefono,
                estado
            });
        });
    });
});







app.get('/admin/proveedorCreate',(req, res)=>{
    res.render('admin/proveedorCreate');
})



app.get('/admin/proveedorEdit/:idProveedor', (req, res) => {    
    const idProveedor = req.params.idProveedor;

    // Primero, selecciona los datos del proveedor
    conexion.query('SELECT * FROM proveedor WHERE idProveedor = ?', [idProveedor], (error, results) => {
        if (error) {
            throw error;
        } else {
            // Verifica si el proveedor existe
            if (results.length > 0) {
                const proveedor = results[0];

                // Renderiza la vista con los datos del proveedor
                res.render('admin/proveedorEdit', {
                    proveedor: proveedor
                });
            } else {
                res.status(404).send('Proveedor no encontrado');
            }
        }
    });
});



app.get('/admin/proveedorDelete/:idProveedor', (req, res) => {
    const idProveedor = req.params.idProveedor;

    // Obtener la fecha actual del sistema en formato YYYY-MM-DD
    const fechaCancelacion = moment().format('YYYY-MM-DD HH:mm:ss');
    
    // Actualizar el estado del proveedor a 2 en la tabla proveedor
    const updateProveedorQuery = 'UPDATE proveedor SET estado_proveedor_idEstadoProveedor = 2, fechaCancelacion = ? WHERE idProveedor = ?';
    
    conexion.query(updateProveedorQuery, [fechaCancelacion, idProveedor], (error, results) => {
        if (error) {
            console.log(error);
            return res.status(500).send('Error actualizando el estado del proveedor.');
        }

        // Redirigir a la vista de proveedores tras la actualización
        res.redirect('/admin/proveedor');
    });
});




const proveedorCrud = require('./views/admin/controllers/proveedorCrud');
app.post('/saveProveedor', proveedorCrud.saveProveedor);
app.post('/updateProveedor', proveedorCrud.updateProveedor);



//reportes proveedor

app.get('/admin/proveedorReporte/:idProveedor', (req, res) => {
    const idProveedor = req.params.idProveedor;

    // Consulta para obtener los datos del proveedor
    const queryProveedor = `
        SELECT p.idProveedor, p.nombre, p.telefono, p.telefono2, p.direccion, p.email, p.vendedor, p.fechaRegistro, p.fechaCancelacion,
               e.nombre AS estadoProveedor
        FROM proveedor p
        LEFT JOIN estado_proveedor e ON p.estado_proveedor_idEstadoProveedor = e.idEstadoProveedor
        WHERE p.idProveedor = ?;
    `;

    conexion.query(queryProveedor, [idProveedor], (error, results) => {
        if (error) {
            console.log(error);
            return res.status(500).send('Error al obtener los datos del proveedor.');
        }

        if (results.length === 0) {
            return res.status(404).send('Proveedor no encontrado.');
        }

        const proveedor = results[0];

        const formatFecha = (fecha) => {
            if (!fecha) return 'Actualmente activo';
            const date = new Date(fecha);
            return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
        };

        // Crear un documento PDF
        const doc = new PDFDocument();
        res.setHeader('Content-Disposition', 'attachment; filename=reporte_' + proveedor.nombre + '.pdf');
        res.setHeader('Content-Type', 'application/pdf');
        doc.pipe(res);

        // Ruta del logo de la empresa
        const logoPath = path.join(__dirname, '/public/img/logo.jpg'); // Ajusta esta ruta según la ubicación de tu logo
        
        // Agregar el logo y la información de la empresa
        doc.image(logoPath, { align: 'center', width: 100 }) // Ajusta las dimensiones y la posición según sea necesario
           .fontSize(20)
           .text('Serviautos Jas', { align: 'center' }) // Ajusta el nombre y la posición según sea necesario
           .moveDown();

        // Agregar título y detalles del proveedor
        doc.fontSize(18).text('Reporte de Proveedor', { align: 'center' });
        doc.moveDown();
        doc.moveDown();

        doc.fontSize(12).text(`ID Proveedor: ${proveedor.idProveedor}`);
        doc.text(`Nombre: ${proveedor.nombre}`);
        doc.text(`Teléfono: ${proveedor.telefono}`);
        doc.text(`Teléfono 2: ${proveedor.telefono2}`);
        doc.text(`Dirección: ${proveedor.direccion}`);
        doc.text(`Email: ${proveedor.email}`);
        doc.text(`Vendedor: ${proveedor.vendedor}`);
        doc.text(`Fecha de Registro: ${formatFecha(proveedor.fechaRegistro)}`);
        doc.text(`Fecha de Cancelación: ${formatFecha(proveedor.fechaCancelacion)}`);
        doc.text(`Estado: ${proveedor.estadoProveedor || 'N/A'}`);

        // Finalizar el PDF
        doc.end();
    });
});


//proveedor reporte activo
app.get('/admin/proveedorReporteActivo', (req, res) => {

    // Consulta para obtener todos los proveedores activos
    const queryProveedoresActivos = `
        SELECT p.idProveedor, p.nombre, p.telefono, p.telefono2, p.direccion, p.email, p.vendedor, p.fechaRegistro, p.fechaCancelacion, e.nombre AS estadoProveedor
        FROM proveedor p
        JOIN estado_proveedor e ON p.estado_proveedor_idEstadoProveedor = e.idEstadoProveedor
        WHERE p.estado_proveedor_idEstadoProveedor = 1;
    `;

    conexion.query(queryProveedoresActivos, (error, results) => {
        if (error) {
            console.log(error);
            return res.status(500).send('Error al obtener los datos de los proveedores.');
        }

        if (results.length === 0) {
            return res.status(404).send('No se encontraron proveedores activos.');
        }

        // Crear un documento PDF
        const doc = new PDFDocument({ margin: 30 });
        res.setHeader('Content-Disposition', 'attachment; filename=reporte_proveedores_activos.pdf');
        res.setHeader('Content-Type', 'application/pdf');
        doc.pipe(res);

        // Ruta del logo de la empresa
        const logoPath = path.join(__dirname, '/public/img/logo.jpg'); // Ajusta esta ruta según la ubicación de tu logo
        
        // Agregar el logo y la información de la empresa
        doc.image(logoPath, { width: 80, align: 'center' })
            .fontSize(20)
            .text('Serviautos Jas', { align: 'center' })
            .moveDown();

        // Título del reporte
        doc.fontSize(18).text('Reporte de Proveedores Activos', { align: 'center' });
        doc.moveDown(2);

        // Función para formatear fechas a dd/mm/aaaa
        const formatFecha = (fecha) => {
            if (!fecha) return 'Actualmente activo';
            const date = new Date(fecha);
            return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
        };

        // Añadir encabezados de la tabla
        doc.fontSize(12).fillColor('black')
            .text('ID', 50, 160, { width: 60, align: 'left' })
            .text('Nombre', 120, 160, { width: 80, align: 'left' })
            .text('Teléfono', 210, 160, { width: 80, align: 'left' })
            .text('Teléfono 2', 300, 160, { width: 80, align: 'left' })
            .text('Dirección', 390, 160, { width: 80, align: 'left' })
            .text('Email', 480, 160, { width: 80, align: 'left' })
            .moveTo(45, 175).lineTo(555, 175).stroke(); // Línea bajo los encabezados

        // Añadir los datos de cada proveedor activo en la tabla
        let yPosition = 185;
        results.forEach(proveedor => {
            doc.fontSize(10).fillColor('black')
                .text(proveedor.idProveedor, 50, yPosition, { width: 60, align: 'left' })
                .text(proveedor.nombre, 120, yPosition, { width: 80, align: 'left' })
                .text(proveedor.telefono, 210, yPosition, { width: 80, align: 'left' })
                .text(proveedor.telefono2, 300, yPosition, { width: 80, align: 'left' })
                .text(proveedor.direccion, 390, yPosition, { width: 80, align: 'left' })
                .text(proveedor.email, 480, yPosition, { width: 80, align: 'left' });
            
            // Añadir una nueva línea por cada proveedor
            yPosition += 45;

            // Si la posición Y es mayor a 720, crear una nueva página
            if (yPosition > 720) {
                doc.addPage();
                yPosition = 50;
            }
        });

        // Finalizar el PDF
        doc.end();
    });
});


app.get('/admin/proveedorReporteInactivo', (req, res) => {

    // Consulta para obtener todos los proveedores inactivos
    const queryProveedoresInactivos = `
        SELECT p.idProveedor, p.nombre, p.telefono, p.telefono2, p.direccion, p.email, p.vendedor, p.fechaRegistro, p.fechaCancelacion, e.nombre AS estadoProveedor
        FROM proveedor p
        JOIN estado_proveedor e ON p.estado_proveedor_idEstadoProveedor = e.idEstadoProveedor
        WHERE p.estado_proveedor_idEstadoProveedor = 2;
    `;

    conexion.query(queryProveedoresInactivos, (error, results) => {
        if (error) {
            console.log(error);
            return res.status(500).send('Error al obtener los datos de los proveedores.');
        }

        if (results.length === 0) {
            return res.status(404).send('No se encontraron proveedores inactivos.');
        }

        // Crear un documento PDF
        const doc = new PDFDocument({ margin: 30 });
        res.setHeader('Content-Disposition', 'attachment; filename=reporte_proveedores_inactivos.pdf');
        res.setHeader('Content-Type', 'application/pdf');
        doc.pipe(res);

        // Ruta del logo de la empresa
        const logoPath = path.join(__dirname, '/public/img/logo.jpg'); // Ajusta esta ruta según la ubicación de tu logo
        
        // Agregar el logo y la información de la empresa
        doc.image(logoPath, { width: 80, align: 'center' })
            .fontSize(20)
            .text('Serviautos Jas', { align: 'center' })
            .moveDown();

        // Título del reporte
        doc.fontSize(18).text('Reporte de Proveedores Inactivos', { align: 'center' });
        doc.moveDown(2);

        // Función para formatear fechas a dd/mm/aaaa
        const formatFecha = (fecha) => {
            if (!fecha) return 'N/A';
            const date = new Date(fecha);
            return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
        };

        // Añadir encabezados de la tabla
        doc.fontSize(12).fillColor('black')
            .text('ID ', 50, 160, { width: 60, align: 'left' })
            .text('Nombre', 120, 160, { width: 80, align: 'left' })
            .text('Teléfono', 210, 160, { width: 80, align: 'left' })
            .text('Teléfono 2', 300, 160, { width: 80, align: 'left' })
            .text('Dirección', 390, 160, { width: 80, align: 'left' })
            .text('Email', 480, 160, { width: 80, align: 'left' })
            .moveTo(45, 175).lineTo(555, 175).stroke(); // Línea bajo los encabezados

        // Añadir los datos de cada proveedor inactivo en la tabla
        let yPosition = 185;
        results.forEach(proveedor => {
            doc.fontSize(10).fillColor('black')
                .text(proveedor.idProveedor, 50, yPosition, { width: 60, align: 'left' })
                .text(proveedor.nombre, 120, yPosition, { width: 80, align: 'left' })
                .text(proveedor.telefono, 210, yPosition, { width: 80, align: 'left' })
                .text(proveedor.telefono2, 300, yPosition, { width: 80, align: 'left' })
                .text(proveedor.direccion, 390, yPosition, { width: 80, align: 'left' })
                .text(proveedor.email, 480, yPosition, { width: 80, align: 'left' });
            
            // Añadir una nueva línea por cada proveedor
            yPosition += 45; // Incrementar en 35 para mayor espacio entre filas

            // Si la posición Y es mayor a 720, crear una nueva página
            if (yPosition > 720) {
                doc.addPage();
                yPosition = 50;
            }
        });

        // Finalizar el PDF
        doc.end();
    });
});


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//empieza codigo para mensaje



app.post('/guardarMensaje', (req, res) => {
    const { nombre, telefono, mensaje } = req.body;

    // Obtener la fecha y hora actual en el formato MySQL
    const fechaRecibido = moment().tz("America/Guatemala").format('YYYY-MM-DD HH:mm:ss'); // Ajusta la zona horaria según sea necesario

    const contactanos = {
        nombre,
        telefono,
        mensaje,
        fechaRecibido,
        estado_mensaje_idEstadoMensaje: 1, // El estado siempre es 1 al guardar
    };

    const sql = 'INSERT INTO mensaje SET ?';

    conexion.query(sql, contactanos, (err, result) => {
        if (err) {
            console.error('Error al enviar el mensaje: ', err);
            return res.redirect('/?mensajeEnviado=false'); // Redirige con parámetro de error
        }

        console.log('Mensaje enviado correctamente');
        res.redirect('/?mensajeEnviado=true'); // Redirige con parámetro de éxito
    });
});




app.get('/admin/mensaje', (req, res) => {
    const { nombre = '', telefono = '', estado = '', pagina = 1 } = req.query;

    const registrosPorPagina = 8;
    const offset = (pagina - 1) * registrosPorPagina;

    // Consulta con filtros dinámicos para obtener mensajes
    let query = `
        SELECT 
            m.idMensaje, 
            m.nombre, 
            m.telefono, 
            e.nombre AS estadoMensaje, 
            m.estado_mensaje_idEstadoMensaje
        FROM mensaje m
        LEFT JOIN estado_mensaje e ON m.estado_mensaje_idEstadoMensaje = e.idEstadoMensaje
        WHERE 1=1
    `;

    // Agregar filtros a la consulta si existen
    if (nombre) {
        query += ` AND m.nombre LIKE '%${nombre}%'`;
    }
    if (telefono) {
        query += ` AND m.telefono LIKE '%${telefono}%'`;
    }
    if (estado) {
        query += ` AND e.nombre LIKE '%${estado}%'`;
    }

    // Agregar la paginación
    query += ` LIMIT ${registrosPorPagina} OFFSET ${offset}`;

    conexion.query(query, (err, results) => {
        if (err) {
            console.error('Error al obtener los mensajes:', err);
            return res.status(500).send('Error en el servidor');
        }

        // Consulta para obtener el total de registros filtrados
        let totalQuery = `
            SELECT COUNT(*) as total 
            FROM mensaje m
            LEFT JOIN estado_mensaje e ON m.estado_mensaje_idEstadoMensaje = e.idEstadoMensaje
            WHERE 1=1
        `;

        // Aplicar los mismos filtros a la consulta de total de registros
        if (nombre) {
            totalQuery += ` AND m.nombre LIKE '%${nombre}%'`;
        }
        if (telefono) {
            totalQuery += ` AND m.telefono LIKE '%${telefono}%'`;
        }
        if (estado) {
            totalQuery += ` AND e.nombre LIKE '%${estado}%'`;
        }

        conexion.query(totalQuery, (err, totalResults) => {
            if (err) {
                console.error('Error al obtener el total de mensajes:', err);
                return res.status(500).send('Error en el servidor');
            }

            const totalRegistros = totalResults[0].total;
            const totalPaginas = Math.ceil(totalRegistros / registrosPorPagina);

            // Renderizar la vista con los resultados filtrados
            res.render('admin/mensaje', {
                results,
                paginaActual: parseInt(pagina, 10),
                totalPaginas,
                nombre, // Mantén los valores de los filtros para que persistan
                telefono,
                estado
            });
        });
    });
});




app.get('/admin/mensajeEdit/:idMensaje', (req, res) => {    
    const idMensaje = req.params.idMensaje;

    // Primero, selecciona los datos del mensaje
    conexion.query('SELECT * FROM mensaje WHERE idMensaje = ?', [idMensaje], (error, results) => {
        if (error) {
            throw error;
        } else {
            // Verifica si el mensaje existe
            if (results.length > 0) {
                const mensaje = results[0];

                // Renderiza la vista con los datos del mensaje
                res.render('admin/mensajeEdit', {
                    mensaje: mensaje
                });
            } else {
                res.status(404).send('Mensaje no encontrado');
            }
        }
    });
});


const mensajeCrud = require('./views/admin/controllers/mensajeCrud');
app.post('/updateMensaje', mensajeCrud.updateMensaje);



app.get('/admin/mensajeDelete/:idMensaje', (req, res) => {
    const idMensaje = req.params.idMensaje;

    // Consulta para eliminar el mensaje
    const deleteMensajeQuery = 'DELETE FROM mensaje WHERE idMensaje = ?';

    conexion.query(deleteMensajeQuery, [idMensaje], (error, results) => {
        if (error) {
            console.log(error);
            return res.status(500).send('Error al eliminar el mensaje.');
        }

        // Redirigir a la vista de mensajes tras la eliminación
        res.redirect('/admin/mensaje');
    });
});





//reporte individual

app.get('/admin/mensajeReporte/:idMensaje', (req, res) => {
    const idMensaje = req.params.idMensaje;

    // Consulta para obtener los datos del mensaje
    const queryMensaje = `
        SELECT m.idMensaje, m.nombre, m.telefono, m.mensaje, m.fechaRecibido, m.fechaLeido,
               e.nombre AS estadoMensaje
        FROM mensaje m
        LEFT JOIN estado_mensaje e ON m.estado_mensaje_idEstadoMensaje = e.idEstadoMensaje
        WHERE m.idMensaje = ?;
    `;

    conexion.query(queryMensaje, [idMensaje], (error, results) => {
        if (error) {
            console.log(error);
            return res.status(500).send('Error al obtener los datos del mensaje.');
        }

        if (results.length === 0) {
            return res.status(404).send('Mensaje no encontrado.');
        }

        const mensaje = results[0];

        const formatFecha = (fecha) => {
            if (!fecha) return 'No disponible';
            const date = new Date(fecha);
            return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
        };

        // Crear un documento PDF
        const doc = new PDFDocument();
        res.setHeader('Content-Disposition', 'attachment; filename=reporte_mensaje_' + mensaje.nombre + '.pdf');
        res.setHeader('Content-Type', 'application/pdf');
        doc.pipe(res);

        // Ruta del logo de la empresa
        const logoPath = path.join(__dirname, '/public/img/logo.jpg'); // Ajusta esta ruta según la ubicación de tu logo
        
        // Agregar el logo y la información de la empresa
        doc.image(logoPath, { align: 'center', width: 100 }) // Ajusta las dimensiones y la posición según sea necesario
           .fontSize(20)
           .text('Serviautos Jas', { align: 'center' }) // Ajusta el nombre y la posición según sea necesario
           .moveDown();

        // Agregar título y detalles del mensaje
        doc.fontSize(18).text('Reporte de Mensaje', { align: 'center' });
        doc.moveDown();
        doc.moveDown();

        doc.fontSize(12).text(`ID Mensaje: ${mensaje.idMensaje}`);
        doc.text(`Nombre: ${mensaje.nombre}`);
        doc.text(`Teléfono: ${mensaje.telefono}`);
        doc.text(`Mensaje: ${mensaje.mensaje}`);
        doc.text(`Fecha Recibido: ${formatFecha(mensaje.fechaRecibido)}`);
        
        // Manejar el campo fechaLeido
        const fechaLeido = mensaje.fechaLeido ? formatFecha(mensaje.fechaLeido) : 'No atendido';
        doc.text(`Fecha Leído: ${fechaLeido}`);
        
        doc.text(`Estado: ${mensaje.estadoMensaje || 'N/A'}`);

        // Finalizar el PDF
        doc.end();
    });
});

// Mensajes nuevos
app.get('/admin/mensajeReporteNoleidos', (req, res) => {

    // Consulta para obtener solo los mensajes nuevos (suponiendo que 1 significa nuevo)
    const queryMensajesNuevos = `
        SELECT m.idMensaje, m.nombre, m.telefono, m.mensaje, m.fechaRecibido, e.nombre AS estadoMensaje
        FROM mensaje m
        JOIN estado_mensaje e ON m.estado_mensaje_idEstadoMensaje = e.idEstadoMensaje
        WHERE m.estado_mensaje_idEstadoMensaje = 1;
    `;

    conexion.query(queryMensajesNuevos, (error, results) => {
        if (error) {
            console.log(error);
            return res.status(500).send('Error al obtener los mensajes nuevos.');
        }

        if (results.length === 0) {
            return res.status(404).send('No se encontraron mensajes nuevos.');
        }

        // Crear un documento PDF
        const doc = new PDFDocument({ margin: 30 });
        res.setHeader('Content-Disposition', 'attachment; filename=reporte_mensajes_nuevos.pdf');
        res.setHeader('Content-Type', 'application/pdf');
        doc.pipe(res);

        // Ruta del logo de la empresa
        const logoPath = path.join(__dirname, '/public/img/logo.jpg'); // Ajusta esta ruta según la ubicación de tu logo
        
        // Agregar el logo y la información de la empresa
        doc.image(logoPath, { width: 80, align: 'center' })
            .fontSize(20)
            .text('Serviautos Jas', { align: 'center' })
            .moveDown();

        // Título del reporte
        doc.fontSize(18).text('Reporte de Mensajes Nuevos', { align: 'center' });
        doc.moveDown(2);

        // Añadir encabezados de la tabla
        doc.fontSize(12).fillColor('black')
            .text('ID', 50, 160, { width: 60, align: 'left' })
            .text('Nombre', 120, 160, { width: 80, align: 'left' })
            .text('Teléfono', 210, 160, { width: 80, align: 'left' })
            .text('Mensaje', 300, 160, { width: 80, align: 'left' })
            .text('Fecha Recibido', 390, 160, { width: 80, align: 'left' })
            .text('Estado', 480, 160, { width: 80, align: 'left' })
            .moveTo(45, 190).lineTo(555, 190).stroke(); // Línea bajo los encabezados, ajustada a 190

        // Añadir los datos de cada mensaje nuevo en la tabla
        let yPosition = 200; // Ajustar posición inicial de los datos
        results.forEach(mensaje => {
            doc.fontSize(10).fillColor('black')
                .text(mensaje.idMensaje, 50, yPosition, { width: 60, align: 'left' })
                .text(mensaje.nombre, 120, yPosition, { width: 80, align: 'left' })
                .text(mensaje.telefono, 210, yPosition, { width: 80, align: 'left' })
                .text(mensaje.mensaje, 300, yPosition, { width: 80, align: 'left' })
                .text(mensaje.fechaRecibido.toISOString().split('T')[0], 390, yPosition, { width: 80, align: 'left' }) // Formato de fecha
                .text(mensaje.estadoMensaje, 480, yPosition, { width: 80, align: 'left' });
            
            // Añadir una nueva línea por cada mensaje
            yPosition += 85;

            // Si la posición Y es mayor a 720, crear una nueva página
            if (yPosition > 720) {
                doc.addPage();
                yPosition = 50;
            }
        });

        // Finalizar el PDF
        doc.end();
    });
});




// Mensajes atendidos
app.get('/admin/mensajeReporteLeidos', (req, res) => {

    // Consulta para obtener solo los mensajes atendidos (suponiendo que 2 significa atendido)
    const queryMensajesAtendidos = `
        SELECT m.idMensaje, m.nombre, m.telefono, m.mensaje, m.fechaRecibido, m.fechaLeido, e.nombre AS estadoMensaje
        FROM mensaje m
        JOIN estado_mensaje e ON m.estado_mensaje_idEstadoMensaje = e.idEstadoMensaje
        WHERE m.estado_mensaje_idEstadoMensaje = 2;
    `;

    conexion.query(queryMensajesAtendidos, (error, results) => {
        if (error) {
            console.log(error);
            return res.status(500).send('Error al obtener los mensajes atendidos.');
        }

        if (results.length === 0) {
            return res.status(404).send('No se encontraron mensajes atendidos.');
        }

        // Crear un documento PDF
        const doc = new PDFDocument({ margin: 30 });
        res.setHeader('Content-Disposition', 'attachment; filename=reporte_mensajes_atendidos.pdf');
        res.setHeader('Content-Type', 'application/pdf');
        doc.pipe(res);

        // Ruta del logo de la empresa
        const logoPath = path.join(__dirname, '/public/img/logo.jpg'); // Ajusta esta ruta según la ubicación de tu logo
        
        // Agregar el logo y la información de la empresa
        doc.image(logoPath, { width: 80, align: 'center' })
            .fontSize(20)
            .text('Serviautos Jas', { align: 'center' })
            .moveDown();

        // Título del reporte
        doc.fontSize(18).text('Reporte de Mensajes Atendidos', { align: 'center' });
        doc.moveDown(2);

        // Añadir encabezados de la tabla
        doc.fontSize(12).fillColor('black')
            .text('ID', 50, 160, { width: 60, align: 'left' })
            .text('Nombre', 120, 160, { width: 80, align: 'left' })
            .text('Teléfono', 210, 160, { width: 80, align: 'left' })
            .text('Mensaje', 300, 160, { width: 80, align: 'left' })
            .text('Fecha Recibido', 390, 160, { width: 80, align: 'left' })
            .text('Fecha Leído', 480, 160, { width: 80, align: 'left' })
            .text('Estado', 570, 160, { width: 80, align: 'left' })
            .moveTo(45, 190).lineTo(655, 190).stroke(); // Línea bajo los encabezados, ajustada a 190

        // Añadir los datos de cada mensaje atendido en la tabla
        let yPosition = 200; // Ajustar posición inicial de los datos
        results.forEach(mensaje => {
            doc.fontSize(10).fillColor('black')
                .text(mensaje.idMensaje, 50, yPosition, { width: 60, align: 'left' })
                .text(mensaje.nombre, 120, yPosition, { width: 80, align: 'left' })
                .text(mensaje.telefono, 210, yPosition, { width: 80, align: 'left' })
                .text(mensaje.mensaje, 300, yPosition, { width: 80, align: 'left' })
                .text(mensaje.fechaRecibido.toISOString().split('T')[0], 390, yPosition, { width: 80, align: 'left' }) // Formato de fecha
                .text(mensaje.fechaLeido ? mensaje.fechaLeido.toISOString().split('T')[0] : 'No atendido', 480, yPosition, { width: 80, align: 'left' })
                .text(mensaje.estadoMensaje, 570, yPosition, { width: 80, align: 'left' });
            
            // Añadir una nueva línea por cada mensaje
            yPosition += 85;

            // Si la posición Y es mayor a 720, crear una nueva página
            if (yPosition > 720) {
                doc.addPage();
                yPosition = 50;
            }
        });

        // Finalizar el PDF
        doc.end();
    });
});



//para el dashboard 

// Agrega esta ruta en tu archivo de rutas para obtener el conteo de mensajes nuevos
app.get('/admin/mensajesNuevosCount', (req, res) => {
    const queryCountMensajesNuevos = `
        SELECT COUNT(*) AS total FROM mensaje 
        WHERE estado_mensaje_idEstadoMensaje = 1;
    `;
    
    conexion.query(queryCountMensajesNuevos, (error, results) => {
        if (error) {
            console.log(error);
            return res.status(500).send('Error al obtener el conteo de mensajes nuevos.');
        }
        
        const totalMensajesNuevos = results[0].total;
        res.json({ total: totalMensajesNuevos });
    });
});






////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

//producto
app.get('/admin/producto', (req, res) => {
    const { nombre = '', stock = '', estado = '', pagina = 1 } = req.query; // Ajustes en los filtros

    const registrosPorPagina = 8; // Puedes ajustar este valor según tus necesidades
    const offset = (pagina - 1) * registrosPorPagina;

    // Consulta con filtros dinámicos para obtener productos
    let query = `
        SELECT 
            p.*, 
            ep.nombre AS nombreEstado 
        FROM producto p
        LEFT JOIN estado_producto ep ON p.estado_producto_idEstadoProducto = ep.idEstadoProducto
        WHERE 1=1
    `;

    // Agregar filtros a la consulta si existen
    if (nombre) {
        query += ` AND p.nombre LIKE '%${nombre}%'`;
    }
    if (stock) {
        query += ` AND p.stock LIKE '%${stock}%'`;
    }
    if (estado) {
        query += ` AND ep.nombre LIKE '%${estado}%'`; // Filtrar por nombre de estado
    }

    // Agregar la paginación
    query += ` LIMIT ${registrosPorPagina} OFFSET ${offset}`;

    conexion.query(query, (err, results) => {
        if (err) {
            console.error('Error al obtener los productos:', err);
            return res.status(500).send('Error en el servidor');
        }

        // Consulta para obtener el total de registros filtrados
        let totalQuery = `
            SELECT COUNT(*) as total 
            FROM producto p
            LEFT JOIN estado_producto ep ON p.estado_producto_idEstadoProducto = ep.idEstadoProducto
            WHERE 1=1
        `;

        // Aplicar los mismos filtros a la consulta de total de registros
        if (nombre) {
            totalQuery += ` AND p.nombre LIKE '%${nombre}%'`;
        }
        if (stock) {
            totalQuery += ` AND p.stock LIKE '%${stock}%'`;
        }
        if (estado) {
            totalQuery += ` AND ep.nombre LIKE '%${estado}%'`; // Filtrar por nombre de estado
        }

        conexion.query(totalQuery, (err, totalResults) => {
            if (err) {
                console.error('Error al obtener el total de productos:', err);
                return res.status(500).send('Error en el servidor');
            }

            const totalRegistros = totalResults[0].total;
            const totalPaginas = Math.ceil(totalRegistros / registrosPorPagina);

            // Renderizar la vista con los resultados filtrados
            res.render('admin/producto', {
                results,
                paginaActual: parseInt(pagina, 10),
                totalPaginas,
                nombre, // Mantén los valores de los filtros para que persistan
                stock,
                estado // Mantener el filtro de estado
            });
        });
    });
});



app.get('/admin/productoCreate', (req, res) => {
    const queryCategoria = 'SELECT idCategoria, nombre FROM categoria';
    const queryMarca = 'SELECT idMarca, nombre FROM marca';
    const queryUnidadMedida = 'SELECT idUnidadMedida, nombre FROM unidad_medida';
    const queryEstadoProducto = 'SELECT idEstadoProducto, nombre FROM estado_producto';

    // Ejecutar cada consulta individualmente y usar Promise.all para esperar a que todas se completen
    const categoriaPromise = new Promise((resolve, reject) => {
        conexion.query(queryCategoria, (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });

    const marcaPromise = new Promise((resolve, reject) => {
        conexion.query(queryMarca, (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });

    const unidadMedidaPromise = new Promise((resolve, reject) => {
        conexion.query(queryUnidadMedida, (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });

    const estadoProductoPromise = new Promise((resolve, reject) => {
        conexion.query(queryEstadoProducto, (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });

    // Ejecutar todas las promesas
    Promise.all([categoriaPromise, marcaPromise, unidadMedidaPromise, estadoProductoPromise])
        .then(([categorias, marcas, unidadesMedida, estadosProducto]) => {
            // Renderizar la vista con los datos
            res.render('admin/productoCreate', {
                categorias,
                marcas,
                unidadesMedida,
                estadosProducto
            });
        })
        .catch(err => {
            console.error('Error al obtener datos para el formulario:', err);
            res.status(500).send('Error en el servidor');
        });
});


const productoCrud = require('./views/admin/controllers/productoCrud');
app.post('/saveProducto', productoCrud.saveProducto);
app.post('/updateProducto', productoCrud.updateProducto);


app.get('/admin/productoDelete/:idProducto', (req, res) => {
    const idProducto = req.params.idProducto;

    // Actualizar el estado del producto a 2 en la tabla producto
    const updateProductoQuery = 'UPDATE producto SET estado_producto_idEstadoProducto = 2 WHERE idProducto = ?';
    
    conexion.query(updateProductoQuery, [idProducto], (error, results) => {
        if (error) {
            console.log(error);
            return res.status(500).send('Error actualizando el estado del producto.');
        }

        // Redirigir a la vista de productos tras la actualización
        res.redirect('/admin/producto');
    });
});


//cargar datos para editar
app.get('/admin/productoEdit/:idProducto', (req, res) => {    
    const idProducto = req.params.idProducto;

    // Primero, selecciona los datos del producto
    conexion.query('SELECT * FROM producto WHERE idProducto = ?', [idProducto], (error, results) => {
        if (error) {
            throw error;
        } else {
            // Verifica si el producto existe
            if (results.length > 0) {
                const producto = results[0];

                // Opcional: Consulta para obtener las categorías, marcas, unidades de medida y estados
                conexion.query('SELECT * FROM categoria', (error, categorias) => {
                    if (error) throw error;

                    conexion.query('SELECT * FROM marca', (error, marcas) => {
                        if (error) throw error;

                        conexion.query('SELECT * FROM unidad_medida', (error, unidadesMedida) => {
                            if (error) throw error;

                            conexion.query('SELECT * FROM estado_producto', (error, estadosProducto) => {
                                if (error) throw error;

                                // Renderiza la vista con los datos del producto y listas desplegables
                                res.render('admin/productoEdit', {
                                    producto: producto,
                                    categorias: categorias,
                                    marcas: marcas,
                                    unidadesMedida: unidadesMedida,
                                    estadosProducto: estadosProducto
                                });
                            });
                        });
                    });
                });
            } else {
                res.status(404).send('Producto no encontrado');
            }
        }
    });
});


// Reportes producto
app.get('/admin/productoReporte/:idProducto', (req, res) => {
    const idProducto = req.params.idProducto;

    // Consulta para obtener los datos del producto
    const queryProducto = `
        SELECT p.idProducto, p.nombre, p.precioUnitario, p.precioSugerido, p.stock, 
               c.nombre AS categoria, m.nombre AS marca, u.nombre AS unidadMedida,
               e.nombre AS estadoProducto
        FROM producto p
        LEFT JOIN categoria c ON p.categoria_idCategoria = c.idCategoria
        LEFT JOIN marca m ON p.marca_idMarca = m.idMarca
        LEFT JOIN unidad_medida u ON p.unidad_medida_idUnidadMedida = u.idUnidadMedida
        LEFT JOIN estado_producto e ON p.estado_producto_idEstadoProducto = e.idEstadoProducto
        WHERE p.idProducto = ?;
    `;

    conexion.query(queryProducto, [idProducto], (error, results) => {
        if (error) {
            console.log(error);
            return res.status(500).send('Error al obtener los datos del producto.');
        }

        if (results.length === 0) {
            return res.status(404).send('Producto no encontrado.');
        }

        const producto = results[0];

        // Función para formatear los precios
        const formatPrecio = (precio) => {
            return new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(precio);
        };

        // Crear un documento PDF
        const doc = new PDFDocument();
        res.setHeader('Content-Disposition', 'attachment; filename=reporte_' + producto.nombre + '.pdf');
        res.setHeader('Content-Type', 'application/pdf');
        doc.pipe(res);

        // Ruta del logo de la empresa
        const logoPath = path.join(__dirname, '/public/img/logo.jpg'); // Ajusta esta ruta según la ubicación de tu logo
        
        // Agregar el logo y la información de la empresa
        doc.image(logoPath, { align: 'center', width: 100 }) // Ajusta las dimensiones y la posición según sea necesario
           .fontSize(20)
           .text('Serviautos Jas', { align: 'center' }) // Ajusta el nombre y la posición según sea necesario
           .moveDown();

        // Agregar título y detalles del producto
        doc.fontSize(18).text('Reporte de Producto', { align: 'center' });
        doc.moveDown();
        doc.moveDown();

        doc.fontSize(12).text(`ID Producto: ${producto.idProducto}`);
        doc.text(`Nombre: ${producto.nombre}`);
        doc.text(`Precio Unitario: ${formatPrecio(producto.precioUnitario)}`);
        doc.text(`Precio Sugerido: ${formatPrecio(producto.precioSugerido)}`);
        doc.text(`Stock: ${producto.stock}`);
        doc.text(`Categoría: ${producto.categoria || 'N/A'}`);
        doc.text(`Marca: ${producto.marca || 'N/A'}`);
        doc.text(`Unidad de Medida: ${producto.unidadMedida || 'N/A'}`);
        doc.text(`Estado: ${producto.estadoProducto || 'N/A'}`);

        // Finalizar el PDF
        doc.end();
    });
});



// Producto reporte activo
app.get('/admin/productoReporteActivo', (req, res) => {

    // Consulta para obtener todos los productos activos
    const queryProductosActivos = `
        SELECT p.idProducto, p.nombre, p.precioUnitario, p.precioSugerido, 
               c.nombre AS categoria, m.nombre AS marca, u.nombre AS unidadMedida, 
               e.nombre AS estadoProducto
        FROM producto p
        JOIN categoria c ON p.categoria_idCategoria = c.idCategoria
        JOIN marca m ON p.marca_idMarca = m.idMarca
        JOIN unidad_medida u ON p.unidad_medida_idUnidadMedida = u.idUnidadMedida
        JOIN estado_producto e ON p.estado_producto_idEstadoProducto = e.idEstadoProducto
        WHERE p.estado_producto_idEstadoProducto = 1;
    `;

    conexion.query(queryProductosActivos, (error, results) => {
        if (error) {
            console.log(error);
            return res.status(500).send('Error al obtener los datos de los productos.');
        }

        if (results.length === 0) {
            return res.status(404).send('No se encontraron productos activos.');
        }

        // Crear un documento PDF
        const doc = new PDFDocument({ margin: 30 });
        res.setHeader('Content-Disposition', 'attachment; filename=reporte_productos_activos.pdf');
        res.setHeader('Content-Type', 'application/pdf');
        doc.pipe(res);

        // Ruta del logo de la empresa
        const logoPath = path.join(__dirname, '/public/img/logo.jpg'); // Ajusta esta ruta según la ubicación de tu logo
        
        // Agregar el logo y la información de la empresa
        doc.image(logoPath, { width: 80, align: 'center' })
            .fontSize(20)
            .text('Serviautos Jas', { align: 'center' })
            .moveDown();

        // Título del reporte
        doc.fontSize(18).text('Reporte de Productos Activos', { align: 'center' });
        doc.moveDown(2);

        // Añadir encabezados de la tabla
        doc.fontSize(12).fillColor('black')
            .text('ID', 50, 160, { width: 60, align: 'left' })
            .text('Nombre', 120, 160, { width: 80, align: 'left' })
            .text('Precio Unitario', 210, 160, { width: 80, align: 'left' })
            .text('Precio Sugerido', 300, 160, { width: 80, align: 'left' })
            .text('Categoría', 390, 160, { width: 80, align: 'left' })
            .text('Marca', 480, 160, { width: 80, align: 'left' })
            .moveTo(45, 200).lineTo(555, 200).stroke(); // Línea bajo los encabezados

        // Añadir los datos de cada producto activo en la tabla
        let yPosition = 215;
        results.forEach(producto => {
            doc.fontSize(10).fillColor('black')
                .text(producto.idProducto, 50, yPosition, { width: 60, align: 'left' })
                .text(producto.nombre, 120, yPosition, { width: 80, align: 'left' })
                .text(producto.precioUnitario.toFixed(2), 210, yPosition, { width: 80, align: 'left' }) // Formateo del precio
                .text(producto.precioSugerido.toFixed(2), 300, yPosition, { width: 80, align: 'left' }) // Formateo del precio
                .text(producto.categoria || 'N/A', 390, yPosition, { width: 80, align: 'left' })
                .text(producto.marca || 'N/A', 480, yPosition, { width: 80, align: 'left' });
            
            // Añadir una nueva línea por cada producto
            yPosition += 45;

            // Si la posición Y es mayor a 720, crear una nueva página
            if (yPosition > 720) {
                doc.addPage();
                yPosition = 50;
            }
        });

        // Finalizar el PDF
        doc.end();
    });
});



// Producto reporte inactivo
app.get('/admin/productoReporteInactivo', (req, res) => {

    // Consulta para obtener todos los productos inactivos
    const queryProductosInactivos = `
        SELECT p.idProducto, p.nombre, p.precioUnitario, p.precioSugerido, 
               c.nombre AS categoria, m.nombre AS marca, u.nombre AS unidadMedida, 
               e.nombre AS estadoProducto
        FROM producto p
        JOIN categoria c ON p.categoria_idCategoria = c.idCategoria
        JOIN marca m ON p.marca_idMarca = m.idMarca
        JOIN unidad_medida u ON p.unidad_medida_idUnidadMedida = u.idUnidadMedida
        JOIN estado_producto e ON p.estado_producto_idEstadoProducto = e.idEstadoProducto
        WHERE p.estado_producto_idEstadoProducto = 2; 
    `;

    conexion.query(queryProductosInactivos, (error, results) => {
        if (error) {
            console.log(error);
            return res.status(500).send('Error al obtener los datos de los productos.');
        }

        if (results.length === 0) {
            return res.status(404).send('No se encontraron productos inactivos.');
        }

        // Crear un documento PDF
        const doc = new PDFDocument({ margin: 30 });
        res.setHeader('Content-Disposition', 'attachment; filename=reporte_productos_inactivos.pdf');
        res.setHeader('Content-Type', 'application/pdf');
        doc.pipe(res);

        // Ruta del logo de la empresa
        const logoPath = path.join(__dirname, '/public/img/logo.jpg'); // Ajusta esta ruta según la ubicación de tu logo
        
        // Agregar el logo y la información de la empresa
        doc.image(logoPath, { width: 80, align: 'center' })
            .fontSize(20)
            .text('Serviautos Jas', { align: 'center' })
            .moveDown();

        // Título del reporte
        doc.fontSize(18).text('Reporte de Productos Inactivos', { align: 'center' });
        doc.moveDown(2);

        // Añadir encabezados de la tabla
        doc.fontSize(12).fillColor('black')
            .text('ID', 50, 160, { width: 60, align: 'left' })
            .text('Nombre', 120, 160, { width: 80, align: 'left' })
            .text('Precio Unitario', 210, 160, { width: 80, align: 'left' })
            .text('Precio Sugerido', 300, 160, { width: 80, align: 'left' })
            .text('Categoría', 390, 160, { width: 80, align: 'left' })
            .text('Marca', 480, 160, { width: 80, align: 'left' })
            .moveTo(45, 200).lineTo(555, 200).stroke(); // Línea bajo los encabezados

        // Añadir los datos de cada producto inactivo en la tabla
        let yPosition = 215;
        results.forEach(producto => {
            doc.fontSize(10).fillColor('black')
                .text(producto.idProducto, 50, yPosition, { width: 60, align: 'left' })
                .text(producto.nombre, 120, yPosition, { width: 80, align: 'left' })
                .text(producto.precioUnitario.toFixed(2), 210, yPosition, { width: 80, align: 'left' }) // Formateo del precio
                .text(producto.precioSugerido.toFixed(2), 300, yPosition, { width: 80, align: 'left' }) // Formateo del precio
                .text(producto.categoria || 'N/A', 390, yPosition, { width: 80, align: 'left' })
                .text(producto.marca || 'N/A', 480, yPosition, { width: 80, align: 'left' });
            
            // Añadir una nueva línea por cada producto
            yPosition += 45;

            // Si la posición Y es mayor a 720, crear una nueva página
            if (yPosition > 720) {
                doc.addPage();
                yPosition = 50;
            }
        });

        // Finalizar el PDF
        doc.end();
    });
});




//reporte de historico precio


app.get('/admin/productoHistorico/:idProducto', (req, res) => {
    const idProducto = req.params.idProducto;

    // Consulta para obtener los datos del producto y el historial de precios
    const queryProducto = `
        SELECT p.idProducto, p.nombre, p.precioUnitario, p.precioSugerido, p.stock, 
               c.nombre AS categoria, m.nombre AS marca, u.nombre AS unidadMedida,
               e.nombre AS estadoProducto
        FROM producto p
        LEFT JOIN categoria c ON p.categoria_idCategoria = c.idCategoria
        LEFT JOIN marca m ON p.marca_idMarca = m.idMarca
        LEFT JOIN unidad_medida u ON p.unidad_medida_idUnidadMedida = u.idUnidadMedida
        LEFT JOIN estado_producto e ON p.estado_producto_idEstadoProducto = e.idEstadoProducto
        WHERE p.idProducto = ?;
    `;

    const queryHistoricoPrecio = `
        SELECT hp.precioAnterior, hp.precioNuevo, hp.fechaCambio
        FROM historico_precio hp
        WHERE hp.producto_idProducto = ?
        ORDER BY hp.fechaCambio DESC;
    `;

    // Ejecutar las consultas en paralelo
    conexion.query(queryProducto, [idProducto], (error, productoResults) => {
        if (error) {
            console.log(error);
            return res.status(500).send('Error al obtener los datos del producto.');
        }

        if (productoResults.length === 0) {
            return res.status(404).send('Producto no encontrado.');
        }

        const producto = productoResults[0];

        // Consulta para el historial de precios del producto
        conexion.query(queryHistoricoPrecio, [idProducto], (error, historicoResults) => {
            if (error) {
                console.log(error);
                return res.status(500).send('Error al obtener el historial de precios.');
            }

            // Función para formatear los precios
            const formatPrecio = (precio) => {
                return new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(precio);
            };

            // Crear un documento PDF
            const doc = new PDFDocument();
            res.setHeader('Content-Disposition', 'attachment; filename=reporte_' + producto.nombre + '.pdf');
            res.setHeader('Content-Type', 'application/pdf');
            doc.pipe(res);

            // Ruta del logo de la empresa
            const logoPath = path.join(__dirname, '/public/img/logo.jpg'); // Ajusta esta ruta según la ubicación de tu logo
            
            // Agregar el logo y la información de la empresa
            doc.image(logoPath, { align: 'center', width: 100 }) // Ajusta las dimensiones y la posición según sea necesario
               .fontSize(20)
               .text('Serviautos Jas', { align: 'center' }) // Ajusta el nombre y la posición según sea necesario
               .moveDown();

            // Agregar título y detalles del producto
            doc.fontSize(18).text('Reporte de Producto', { align: 'center' });
            doc.moveDown();
            doc.moveDown();

            doc.fontSize(12).text(`ID Producto: ${producto.idProducto}`);
            doc.text(`Nombre: ${producto.nombre}`);
            doc.text(`Precio Unitario: ${formatPrecio(producto.precioUnitario)}`);
            doc.text(`Precio Sugerido: ${formatPrecio(producto.precioSugerido)}`);
            doc.text(`Stock: ${producto.stock}`);
            doc.text(`Categoría: ${producto.categoria || 'N/A'}`);
            doc.text(`Marca: ${producto.marca || 'N/A'}`);
            doc.text(`Unidad de Medida: ${producto.unidadMedida || 'N/A'}`);
            doc.text(`Estado: ${producto.estadoProducto || 'N/A'}`);

            // Espacio para separar la información del producto y el historial de precios
            doc.moveDown();
            doc.fontSize(16).text('Historial de Precios', { align: 'center' });
            doc.moveDown();

            // Verificar si hay historial de precios
            if (historicoResults.length === 0) {
                doc.fontSize(12).text('No hay registros de historial de precios para este producto.');
            } else {
                // Agregar cada entrada del historial de precios
                historicoResults.forEach((historico) => {
                    doc.fontSize(12).text(`Fecha de Cambio: ${historico.fechaCambio}`);
                    doc.text(`Precio Anterior: ${formatPrecio(historico.precioAnterior)}`);
                    doc.text(`Precio Nuevo: ${formatPrecio(historico.precioNuevo)}`);
                    doc.moveDown();
                });
            }

            // Finalizar el PDF
            doc.end();
        });
    });
});

















////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


//coompra de producto
// Ruta para obtener productos activos
app.get('/admin/comprar', (req, res) => {
    const { codigo = '', fecha = '', estado = '', pagina = 1 } = req.query; // Ajustes en los filtros

    const registrosPorPagina = 8; // Puedes ajustar este valor según tus necesidades
    const offset = (pagina - 1) * registrosPorPagina;

    // Consulta con filtros dinámicos para obtener las compras
    let query = `
        SELECT 
            c.idCompra, 
            c.codigo, 
            c.fecha, 
            c.estado_compra_idEstadoCompra, 
            e.nombre AS nombreEstado 
        FROM compra c
        LEFT JOIN estado_compra e ON c.estado_compra_idEstadoCompra = e.idEstadoCompra
        WHERE 1=1
    `;

    // Agregar filtros a la consulta si existen
    if (codigo) {
        query += ` AND c.codigo LIKE '%${codigo}%'`;
    }
    if (fecha) {
        query += ` AND c.fecha LIKE '%${fecha}%'`;
    }
    if (estado) {
        query += ` AND e.nombre LIKE '%${estado}%'`; // Filtrar por nombre de estado
    }

    // Agregar la paginación
    query += ` LIMIT ${registrosPorPagina} OFFSET ${offset}`;

    conexion.query(query, (err, results) => {
        if (err) {
            console.error('Error al obtener las compras:', err);
            return res.status(500).send('Error en el servidor');
        }

        // Consulta para obtener el total de registros filtrados
        let totalQuery = `
            SELECT COUNT(*) as total 
            FROM compra c
            LEFT JOIN estado_compra e ON c.estado_compra_idEstadoCompra = e.idEstadoCompra
            WHERE 1=1
        `;

        // Aplicar los mismos filtros a la consulta de total de registros
        if (codigo) {
            totalQuery += ` AND c.codigo LIKE '%${codigo}%'`;
        }
        if (fecha) {
            totalQuery += ` AND c.fecha LIKE '%${fecha}%'`;
        }
        if (estado) {
            totalQuery += ` AND e.nombre LIKE '%${estado}%'`; // Filtrar por nombre de estado
        }

        conexion.query(totalQuery, (err, totalResults) => {
            if (err) {
                console.error('Error al obtener el total de compras:', err);
                return res.status(500).send('Error en el servidor');
            }

            const totalRegistros = totalResults[0].total;
            const totalPaginas = Math.ceil(totalRegistros / registrosPorPagina);

            // Renderizar la vista con los resultados filtrados
            res.render('admin/comprar', {
                results,
                paginaActual: parseInt(pagina, 10),
                totalPaginas,
                codigo, // Mantén los valores de los filtros para que persistan
                fecha,  // Mantener el filtro de fecha
                estado  // Mantener el filtro de estado
            });
        });
    });
});









app.get('/admin/comprarCreate', (req, res) => {

    const queryProducto = 'SELECT idProducto, nombre FROM producto WHERE estado_producto_idEstadoProducto = 1';
    const queryProveedor = 'SELECT idProveedor, nombre FROM proveedor WHERE estado_proveedor_idEstadoProveedor = 1';
    const queryTipoPago = 'SELECT idTipo_pago, tipo FROM tipo_pago';


    const productoPromise = new Promise((resolve, reject) => {
        conexion.query(queryProducto, (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });

    const proveedorPromise = new Promise((resolve, reject) => {
        conexion.query(queryProveedor, (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });

    const TipoPagoPromise = new Promise((resolve, reject) => {
        conexion.query(queryTipoPago, (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });


    Promise.all([productoPromise,proveedorPromise,TipoPagoPromise])
        .then(([productos, proveedores,tipoPagos]) => {
            // Renderizar la vista con los datos
            res.render('admin/comprarCreate', {
                productos,
                proveedores,
                tipoPagos
            });
        })
        .catch(err => {
            console.error('Error al obtener datos para el formulario:', err);
            res.status(500).send('Error en el servidor');
        });
});

////////////////////////////////////////////////////////////////////////////////////////////////////////////



app.post('/saveComprar', (req, res) => {
    const { proveedor_idProveedor, tipo_pago, totalGlobal } = req.body;
    let { 'producto_idProducto[]': producto_idProducto, 'cantidad[]': cantidad, 'precioUnitario[]': precioUnitario } = req.body;

    const codigo = Math.floor(10000000 + Math.random() * 90000000);
    const fecha = moment().tz("America/Guatemala").format('YYYY-MM-DD HH:mm:ss'); // Utiliza la zona horaria de Guatemala
    const estado_compra_idEstadoCompra = 1; // Pendiente

    // Asegurarse de que los arrays sean tratados como tal
    producto_idProducto = Array.isArray(producto_idProducto) ? producto_idProducto : [producto_idProducto];
    cantidad = Array.isArray(cantidad) ? cantidad : [cantidad];
    precioUnitario = Array.isArray(precioUnitario) ? precioUnitario : [precioUnitario];

    // Validación de datos
    for (let i = 0; i < producto_idProducto.length; i++) {
        if (!producto_idProducto[i] || !cantidad[i] || !precioUnitario[i]) {
            console.error(`Error: Datos inválidos en producto, cantidad o precio en el índice: ${i}`);
            return res.status(400).send(`Error: Datos inválidos en producto, cantidad o precio en el índice: ${i}`);
        }
    }

    // Insertar en la tabla 'compra'
    const queryCompra = `INSERT INTO compra (codigo, fecha, total, tipo_pago_idTipo_pago, proveedor_idProveedor, estado_compra_idEstadoCompra) 
                         VALUES (?, ?, ?, ?, ?, ?)`;

    conexion.query(queryCompra, [codigo, fecha, totalGlobal, tipo_pago, proveedor_idProveedor, estado_compra_idEstadoCompra], (err, result) => {
        if (err) {
            console.error('Error al insertar en compra:', err);
            return res.status(500).send('Error al guardar la compra');
        }

        const compra_idCompra = result.insertId; // Obtener el ID de la compra insertada

        // Insertar los detalles de la compra (detalle_compra)
        let detalleQueries = [];
        for (let i = 0; i < producto_idProducto.length; i++) {
            const queryDetalleCompra = `INSERT INTO detalle_compra (producto_idProducto, cantidad, precioUnitario, compra_idCompra) 
                                        VALUES (?, ?, ?, ?)`;

            detalleQueries.push(new Promise((resolve, reject) => {
                // Insertar los datos en 'detalle_compra'
                conexion.query(queryDetalleCompra, [producto_idProducto[i], cantidad[i], precioUnitario[i], compra_idCompra], (err) => {
                    if (err) {
                        console.error('Error en detalle_compra:', err);
                        return reject(err);
                    }

                    // Obtener el precio actual del producto (precioAnterior)
                    const queryGetPrecioAnterior = `SELECT precioUnitario, stock FROM producto WHERE idProducto = ?`;
                    conexion.query(queryGetPrecioAnterior, [producto_idProducto[i]], (err, result) => {
                        if (err) {
                            console.error('Error al obtener precioAnterior o stock:', err);
                            return reject(err);
                        }

                        const precioAnterior = result[0].precioUnitario;
                        const stockActual = result[0].stock;

                        // Insertar en 'historico_precio'
                        const queryInsertHistorico = `INSERT INTO historico_precio (precioAnterior, precioNuevo, fechaCambio, producto_idProducto) 
                                                      VALUES (?, ?, ?, ?)`;
                        const precioNuevo = precioUnitario[i];
                        conexion.query(queryInsertHistorico, [precioAnterior, precioNuevo, fecha, producto_idProducto[i]], (err) => {
                            if (err) {
                                console.error('Error al insertar en historico_precio:', err);
                                return reject(err);
                            }

                            // Actualizar 'precioUnitario' y 'stock' en la tabla 'producto'
                            const queryUpdateProducto = `UPDATE producto SET precioUnitario = ?, stock = ? WHERE idProducto = ?`;
                            const nuevoStock = stockActual + parseInt(cantidad[i], 10); // Sumar la cantidad al stock actual
                            conexion.query(queryUpdateProducto, [precioUnitario[i], nuevoStock, producto_idProducto[i]], (err) => {
                                if (err) {
                                    console.error('Error al actualizar producto:', err);
                                    return reject(err);
                                }
                                resolve();
                            });
                        });
                    });
                });
            }));
        }

        // Ejecutar todas las inserciones de detalle de compra, historico_precio y actualizaciones de producto
        Promise.all(detalleQueries)
            .then(() => {
                console.log('Compra, detalles, histórico de precios y actualización de productos guardados correctamente');
                res.redirect('/admin/comprar'); // Redirigir a la página deseada después de guardar
            })
            .catch((error) => {
                console.error('Error al procesar los datos de la compra:', error);
                res.status(500).send('Error al procesar los datos de la compra');
            });
    });
});

////////////////////////////////////////////////
//anular compra

app.get('/admin/compraAnular/:idCompra', (req, res) => {
    const idCompra = req.params.idCompra;

    // Consulta para obtener los detalles de la compra
    const queryDetalles = `
        SELECT dc.producto_idProducto, dc.cantidad
        FROM detalle_compra dc
        WHERE dc.compra_idCompra = ?;
    `;

    // Consulta para anular la compra
    const queryAnularCompra = `
        UPDATE compra
        SET estado_compra_idEstadoCompra = 2  
        WHERE idCompra = ?;
    `;

    // Comenzar la transacción
    conexion.beginTransaction(err => {
        if (err) {
            return res.status(500).send('Error al iniciar la transacción.');
        }

        // Obtener detalles de la compra
        conexion.query(queryDetalles, [idCompra], (error, detallesResults) => {
            if (error) {
                return conexion.rollback(() => {
                    res.status(500).send('Error al obtener los detalles de la compra.');
                });
            }

            // Si no hay detalles, puedes enviar un mensaje indicando que no hay nada que anular
            if (detallesResults.length === 0) {
                return conexion.rollback(() => {
                    res.status(404).send('No se encontraron detalles para anular esta compra.');
                });
            }

            // Crear un array de consultas para restar del stock
            const updateStockQueries = detallesResults.map(detalle => {
                const { producto_idProducto, cantidad } = detalle;
                return new Promise((resolve, reject) => {
                    const queryActualizarStock = `
                        UPDATE producto
                        SET stock = stock - ?

                        WHERE idProducto = ?;
                    `;
                    conexion.query(queryActualizarStock, [cantidad, producto_idProducto], (err) => {
                        if (err) {
                            return reject(err);
                        }
                        resolve();
                    });
                });
            });

            // Esperar que todas las consultas para actualizar el stock se completen
            Promise.all(updateStockQueries)
                .then(() => {
                    // Anular la compra
                    conexion.query(queryAnularCompra, [idCompra], (error) => {
                        if (error) {
                            return conexion.rollback(() => {
                                res.status(500).send('Error al anular la compra.');
                            });
                        }

                        // Si todo es exitoso, confirmar la transacción
                        conexion.commit(err => {
                            if (err) {
                                return conexion.rollback(() => {
                                    res.status(500).send('Error al confirmar la transacción.');
                                });
                            }

                            // Responder con éxito
                            res.status(200).send('Compra anulada y stock actualizado exitosamente.');
                        });
                    });
                })
                .catch(err => {
                    conexion.rollback(() => {
                        res.status(500).send('Error al actualizar el stock de los productos.');
                    });
                });
        });
    });
});

/////////////////////////////////////////////////////////////////////////////////////

//reporte compra con detalle de compra
app.get('/admin/comprarReporte/:idCompra', (req, res) => {
    const idCompra = req.params.idCompra;

    // Consulta para obtener los datos de la compra
    const queryCompra = `
        SELECT c.idCompra, c.fecha, c.codigo, c.total, 
               p.nombre AS proveedor, e.nombre AS estadoCompra, tp.tipo AS tipoPago
        FROM compra c
        LEFT JOIN proveedor p ON c.proveedor_idProveedor = p.idProveedor
        LEFT JOIN estado_compra e ON c.estado_compra_idEstadoCompra = e.idEstadoCompra
        LEFT JOIN tipo_pago tp ON c.tipo_pago_idTipo_pago = tp.idTipo_pago
        WHERE c.idCompra = ?;
    `;

    // Consulta para obtener los detalles de la compra
    const queryDetalleCompra = `
        SELECT dc.producto_idProducto, pr.nombre AS productoNombre, dc.cantidad, dc.precioUnitario, 
               (dc.cantidad * dc.precioUnitario) AS precioTotal
        FROM detalle_compra dc
        LEFT JOIN producto pr ON dc.producto_idProducto = pr.idProducto
        WHERE dc.compra_idCompra = ?;
    `;

    // Ejecutar la consulta principal de la compra
    conexion.query(queryCompra, [idCompra], (error, compraResults) => {
        if (error) {
            console.log(error);
            return res.status(500).send('Error al obtener los datos de la compra.');
        }

        if (compraResults.length === 0) {
            return res.status(404).send('Compra no encontrada.');
        }

        const compra = compraResults[0];

        // Ejecutar la consulta para obtener los detalles de la compra
        conexion.query(queryDetalleCompra, [idCompra], (error, detalleResults) => {
            if (error) {
                console.log(error);
                return res.status(500).send('Error al obtener los detalles de la compra.');
            }

            // Crear un documento PDF
            const doc = new PDFDocument();
            res.setHeader('Content-Disposition', 'attachment; filename=reporte_compra_' + compra.codigo + '.pdf');
            res.setHeader('Content-Type', 'application/pdf');
            doc.pipe(res);

            // Ruta del logo de la empresa
            const logoPath = path.join(__dirname, '/public/img/logo.jpg'); // Ajusta esta ruta según la ubicación de tu logo

            // Agregar el logo y la información de la empresa
            doc.image(logoPath, { align: 'center', width: 100 })
               .fontSize(20)
               .text('Serviautos Jas', { align: 'center' }) 
               .moveDown();

            // Agregar título y detalles de la compra
            doc.fontSize(18).text('Reporte de Compra', { align: 'center' });
            doc.moveDown();

            doc.fontSize(12).text(`ID Compra: ${compra.idCompra}`);
            doc.text(`Código: ${compra.codigo}`);
            doc.text(`Fecha: ${compra.fecha}`);
            doc.text(`Total: ${compra.total}`);
            doc.text(`Proveedor: ${compra.proveedor || 'N/A'}`);
            doc.text(`Estado de la Compra: ${compra.estadoCompra || 'N/A'}`);
            doc.text(`Tipo de Pago: ${compra.tipoPago || 'N/A'}`);

            // Espacio para separar los detalles de la compra
            doc.moveDown();
            doc.fontSize(16).text('Detalles de la Compra', { align: 'center' });
            doc.moveDown();

            // Verificar si hay detalles de la compra
            if (detalleResults.length === 0) {
                doc.fontSize(12).text('No hay registros de detalles para esta compra.');
            } else {
                // Agregar cada detalle de la compra
                detalleResults.forEach((detalle) => {
                    doc.fontSize(12).text(`Producto: ${detalle.productoNombre || 'N/A'}`);
                    doc.text(`Cantidad: ${detalle.cantidad}`);
                    doc.text(`Precio Unitario: ${detalle.precioUnitario}`);
                    doc.text(`Precio Total: ${detalle.precioTotal}`);
                    doc.moveDown();
                });
            }

            // Finalizar el PDF
            doc.end();
        });
    });
});



////////////////////////////////////////////////





////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// 8 - Invocamos a la conexion de la DB
const conexion = require('./database/db');

//9 - establecemos las rutas
	app.get('/admin/login',(req, res)=>{
		res.render('admin/login');
	})

	app.get('/admin/register',(req, res)=>{
		res.render('admin/register');
	})

//10 - Método para la REGISTRACIÓN



// Supongamos que este es el proceso de registro de un usuario
app.post('/register', async (req, res) => {
    const { user, password, rol_idRol } = req.body;

    // Encriptar la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = {
        user,
        password: hashedPassword,
        rol_idRol
    };

    const sql = 'INSERT INTO usuario SET ?';

    conexion.query(sql, newUser, (err, result) => {
        if (err) {
            console.error('Error al registrar el usuario: ', err);
            return res.status(500).send('Error al registrar el usuario');
        }

        res.redirect('/login');
    });
});



//11 - Metodo para la autenticacion
app.post('/auth', async (req, res)=> {
	const user = req.body.user;
	const pass = req.body.pass;    
    let passwordHash = await bcrypt.hash(pass, 8);
	if (user && pass) {
		conexion.query('SELECT * FROM users WHERE user = ?', [user], async (error, results, fields)=> {
			if( results.length == 0 || !(await bcrypt.compare(pass, results[0].pass)) ) {    
				res.render('login', {
                        alert: true,
                        alertTitle: "Error",
                        alertMessage: "USUARIO y/o PASSWORD incorrectas",
                        alertIcon:'error',
                        showConfirmButton: true,
                        timer: false,
                        ruta: 'login'    
                    });
				
				//Mensaje simple y poco vistoso
                //res.send('Incorrect Username and/or Password!');				
			} else {         
				//creamos una var de session y le asignamos true si INICIO SESSION       
				req.session.loggedin = true;                
				req.session.name = results[0].name;
				res.render('login', {
					alert: true,
					alertTitle: "Conexión exitosa",
					alertMessage: "¡LOGIN CORRECTO!",
					alertIcon:'success',
					showConfirmButton: false,
					timer: 1500,
					ruta: ''
				});        			
			}			
			res.end();
		});
	} else {	
		res.send('Please enter user and Password!');
		res.end();
	}
});

//12 - Método para controlar que está auth en todas las páginas
// Middleware para verificar si el usuario está autenticado
function isAuthenticated(req, res, next) {
    if (req.session.loggedin) {
        next(); // Si está autenticado, pasa al siguiente middleware o ruta
    } else {
        res.render('index', { // Redirige al inicio de sesión si no está autenticado
            login: false,
            name: 'Debe iniciar sesión'
        });
    }
}
// Ruta para la página principal
app.get('/', (req, res) => {
    if (req.session.loggedin) {
        res.render('index', {
            login: true,
            name: req.session.name
        });
    } else {
        res.render('index', {
            login: false,
            name: 'Debe iniciar sesión'
        });
    }
    res.end();
});

// Rutas protegidas con autenticación
app.get('/admin/dashboard', isAuthenticated, (req, res) => {
    res.render('admin/dashboard', {
        login: true,
        name: req.session.name
    });
});

app.get('/admin/usuario', isAuthenticated, (req, res) => {     
    conexion.query('SELECT idUsuario, user, password, rol_idRol FROM usuario', (error, results) => {
        if (error) {
            throw error;
        } else {  
            res.render('admin/usuario', { results: results, login: true, name: req.session.name }); 
        }   
    });
});


// Middleware para limpiar la caché después del logout
app.use((req, res, next) => {
    if (!req.session.loggedin) {  
        res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
        res.header('Expires', '-1');
        res.header('Pragma', 'no-cache');
    }
    next();
});

// Ruta para cerrar sesión
app.get('/admin/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error al destruir la sesión: ', err);
            return res.status(500).send('Error al cerrar sesión.');
        }
        // Redirige a la página principal o de inicio de sesión
        res.clearCookie('connect.sid', { path: '/' }); // Opcional: limpia la cookie de sesión
        res.redirect('/');  // Asegúrate de que '/' apunte al index
    });
});



app.listen(3000, (req, res)=>{
    console.log('SERVER RUNNING IN http://localhost:3000');
});