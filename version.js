{
  "name": "script2shot",
  "version": "1.0.0",
  "main": "main.js",
  "scripts": {
    "start": "electron .",
    "dist": "electron-builder --win nsis"
  },
  "build": {
    "appId": "com.modsquadacademy.script2shot",
    "productName": "Script2Shot",
    "files": [
      "**/*",
      "!node_modules/**/*",
      "!.git/**/*",
      "!dist/**/*",
      "!screenshot-*.png"
    ],
    "win": {
      "target": "nsis",
      "icon": "s2sicon.ico"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true
    }
  }
}
