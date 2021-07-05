fx_version 'cerulean'
game 'gta5'

author 'mufty'
description 'MRP Clothes shops'
version '0.0.1'

dependencies {
    "mrp_core"
}

files {
    'config/config.json',
}

client_scripts {
    '@mrp_core/shared/debug.js',
    'client/main.js',
}

server_scripts {
}
