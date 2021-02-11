import { app, BrowserWindow, dialog, Menu } from "electron";
import * as path from "path";
import { StructureFeatureManger } from "./StructureFeatureManager";

let sfm: StructureFeatureManger
let mainWindow: BrowserWindow

let lastFile: string

const menuTemplate: Electron.MenuItemConstructorOptions[]  = [
  {
    label: 'File',
    submenu: [
      { 
        label: 'Open',
        accelerator: process.platform === 'darwin' ? 'Cmd+O' : 'Ctrl+O',
        async click() {
          const response = await dialog.showOpenDialog(null, { properties: ['openFile'] })
          if (!response.canceled){
            try{
              sfm = await StructureFeatureManger.loadFromFile(response.filePaths[0])
            } catch(err) {
              dialog.showErrorBox("Cound not open file", err.toString())
              return
            }
            lastFile = response.filePaths[0]
            await generate()
            mainWindow.webContents.send('structure-update', sfm.getWorld())
          }
        }
      },
      {
        label: 'Reload',
        accelerator: process.platform === 'darwin' ? 'Cmd+R' : 'Ctrl+R',
        async click() {
          try{
            sfm = await StructureFeatureManger.loadFromFile(lastFile)
          } catch(err) {
            dialog.showErrorBox("Cound not open file", err.toString())
            return
          }
          await generate()
          mainWindow.webContents.send('structure-update', sfm.getWorld())
        }
      },
      {role: 'quit'}
    ]
  },
  {
    label: 'View',
    submenu: [
      {
        label: 'Toggle Bounding Boxes',
        accelerator: process.platform === 'darwin' ? 'Cmd+B' : 'Ctrl+B',
        async click() {
          mainWindow.webContents.send('toggle-bounding-boxes')
        }
      },
      {
        label: 'Rendering',
        submenu: [
          {
            label: 'Release',
            type: 'radio',
            async click() {
              mainWindow.webContents.send('set-version','release')
            }
          },
          {
            label: 'Snapshot',
            type: 'radio',
            async click() {
              mainWindow.webContents.send('set-version','snapshot')
            }
          }
        ]
      },
      {role: 'toggleDevTools'}
    ]
  }
]

function createWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: true
    },
    width: 800,
  });

  // and load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, "../index.html"));

  // Open the DevTools.
  //mainWindow.webContents.openDevTools();
}

async function generate(){
  if (sfm !== undefined){
    await sfm.generate()
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", () => {
  createWindow();

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);  

  app.on("activate", function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.
