import { app, BrowserWindow, dialog } from 'electron';
import getPort from 'get-port';
import decompress from 'decompress';
import child_process from 'child_process';
import requestPromise from 'minimal-request-promise';
import path from 'path';
import fs from 'fs';
let platform;
let mainWindow = null;
let loading = null;
let serverProcess = null;
let allowClose = false;
const jreFolder = 'jdk-21.0.1+12-jre';

function error_log(exception) {
    fs.appendFile('error.log', exception.stack + "\n", (err) => {
        if (err) throw err;
    });
}

try {
    const gotTheLock = app.requestSingleInstanceLock();

    const showApplication = function (appUrl) {
        mainWindow = new BrowserWindow({
            title: 'My App'
            , show: false
            , width: 1200
            , height: 800
            , frame: true
        });
        mainWindow.setMenu(null);
        mainWindow.loadURL(appUrl);
        mainWindow.once('ready-to-show', () => {
            loading.hide();
            mainWindow.show();
        });
        mainWindow.on('closed', function () {
            mainWindow = null;
            app.quit();
        });
        mainWindow.on('close', function (e) {
            if (serverProcess && !allowClose) {
                dialog.showMessageBox(this, {
                    type: 'question'
                    , buttons: ['Yes', 'No']
                    , title: "Confirm"
                    , message: "Are you sure you want to close the application?"
                }).then(result => {
                    if (result.response === 0) {
                        allowClose = true;
                        app.quit();
                    }
                });
                e.preventDefault();
            }
        });
    };
    const awaitStartUp = function (appUrl, callback) {
        requestPromise.get(appUrl).then(function (response) {
            callback();
        }, function (response) {
            setTimeout(function () {
                awaitStartUp(appUrl, callback);
            }, 200);
        });
    };
    const focusSecondInstance = function () {
        app.on('second-instance', (event, commandLine, workingDirectory) => {
            if (mainWindow) {
                if (mainWindow.isMinimized()) {
                    mainWindow.restore();
                }
                mainWindow.focus();
            }
        })
    };
    const getJavaFile = function () {
        var files = fs.readdirSync(app.getAppPath() + "/java/");
        var filename = null;
        for (var i in files) {
            if (path.extname(files[i]) === ".jar") {
                filename = path.basename(files[i]);
                break;
            }
        }
        if (!filename) {
            throw new Error("There is no JAR file in: " + app.getAppPath() + "/java/ !!");
        }
        return filename;
    };
    const showStartUpErrorMessage = function () {
        setTimeout(function () {
            dialog.showMessageBox(null, {
                type: 'error'
                , buttons: ['Ok']
                , title: "Java Runtime not available"
                , message: "Please make sure that the Java Runtime Environment is installed and available in the 'java' folder."
            });
        }, 200);
    }
    const spawnServerProcess = function (port) {
        var filename = getJavaFile();
        platform = process.platform;
        if (platform === 'win32') {
            return child_process.spawn(jreFolder + path.sep + 'bin' + path.sep + 'java', ['-jar', '-Dvaadin.productionMode=true', '-Dserver.port=' + port, filename, '--logging.file=./logs/application.log'], {
                cwd: app.getAppPath() + path.sep + 'java' + path.sep
            }).on('error', function (code, signal) {
                '+ path.sep +'
                showStartUpErrorMessage();
            });
        } else if (platform === 'darwin') {
            child_process.exec('chmod +X ' + app.getAppPath() + '/java/' + jreFolder + '/Contents/Home/bin/' + 'java');
            if (!app.getAppPath().startsWith("/Applications/")) {
                dialog.showMessageBox(null, {
                    type: 'error'
                    , buttons: ['Ok']
                    , title: 'Wrong directory'
                    , message: 'Please move the application to the Applications folder.'
                });
                app.quit();
                return null;
            }
            return child_process.spawn(jreFolder + '/Contents/Home/bin/java', ['-jar', '-Dvaadin.productionMode=true', '-Dserver.port=' + port, filename, '--logging.file=./logs/application.log'], {
                cwd: app.getAppPath() + '/java/'
            }).on('error', function (code, signal) {
                showStartUpErrorMessage();
            });
        } else if (platform === 'linux') {
            return child_process.spawn(jreFolder + '/bin/java', ['-jar', '-Dvaadin.productionMode=true', '-Dserver.port=' + port, filename, '--logging.file=./logs/application.log'], {
                cwd: app.getAppPath() + '/java/'
            }).on('error', function (code, signal) {
                showStartUpErrorMessage();
            });
        } else {
            throw new Error("Platform not supported");
        }
    };
    const showLoadingScreen = function () {
        loading = new BrowserWindow({
            show: true
            , frame: false
            , width: 500
            , height: 280
        });
        loading.loadURL('file://' + app.getAppPath() + '/loading.html');
    };
    const beginStartUp = function () {
        (async () => {
            try {
                const port = await getPort();
                serverProcess = spawnServerProcess(port);
                var appUrl = "http://localhost:" + port;
                awaitStartUp(appUrl, function () {
                    showApplication(appUrl);
                });
            } catch (e) {
                error_log(e);
            }
        })();
    }
    if (!gotTheLock) {
        app.quit()
    } else {
        focusSecondInstance();
        app.on('window-all-closed', function () {
            app.quit();
        });
        app.on('ready', function () {
            try {
                showLoadingScreen();
                platform = process.platform;
                const jrePath = app.getAppPath() + path.sep + 'java' + path.sep + jreFolder;
                const compressedJreFilePath = app.getAppPath() + path.sep + 'java' + path.sep;
                const extractionTargetPath = app.getAppPath() + path.sep + 'java' + path.sep;
                let zipFileName;
                if (platform === 'win32') {
                    zipFileName = 'jre_windows.zip';
                } else if (platform === 'darwin') {
                    zipFileName = 'jre_mac.tar.gz';
                } else if (platform === 'linux') {
                    zipFileName = 'jre_linux.tar.gz';
                }
                if (zipFileName) {
                    if (!fs.existsSync(jrePath)) {
                        decompress(compressedJreFilePath + zipFileName, extractionTargetPath).then(files => {
                            // remove compressed jre once unpacked
                            fs.unlinkSync(compressedJreFilePath + zipFileName);
                            beginStartUp();
                        });
                    } else {
                        beginStartUp();
                    }
                } else {
                    throw new Error("Platform not supported");
                }
            } catch (e) {
                error_log(e);
            }
        });
        app.on('will-quit', function () {
            serverProcess.kill('SIGINT');
        });
    }
} catch (e) {
    error_log(e);
}
