const { createLogger, transports, format}= require('winston')


exports.apiControllerLogger= createLogger({
    transports: [
        new transports.File({
            filename: './logs/infoPdfGenControllers.log',
            level: 'info',
            format: format.combine(format.timestamp(), format.json())
        }),
        new transports.File({
            filename: './logs/errorsPdfGenControllers.log',
            level: 'error',
            format: format.combine(format.timestamp(), format.json())
        })
    ]
})


exports.adminUserControllers= createLogger({
    transports: [
        new transports.File({
            filename: './logs/infoUserAdminControllers.log',
            level: 'info',
            format: format.combine(format.timestamp(), format.json())
        }),
        new transports.File({
            filename: './logs/errorsUserAdminControllers.log',
            level: 'error',
            format: format.combine(format.timestamp(), format.json())
        })
    ]
})


exports.servicesLogger= createLogger({
    transports: [
        new transports.File({
            filename: './logs/infoServicesLogs.log',
            level: 'info',
            format: format.combine(format.timestamp(), format.json())
        }),
        new transports.File({
            filename: './logs/errorServicesLogs.log',
            level: 'error',
            format: format.combine(format.timestamp(), format.json())
        })
    ]
})


exports.middlewaresLogger= createLogger({
    transports: [
        new transports.File({
            filename: './logs/infoMiddlewareLogs.log',
            level: 'info',
            format: format.combine(format.timestamp(), format.json())
        }),
        new transports.File({
            filename: './logs/errorMiddlewareLogs.log',
            level: 'error',
            format: format.combine(format.timestamp(), format.json())
        })
    ]
})
