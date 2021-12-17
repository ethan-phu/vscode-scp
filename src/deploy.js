/**
@File    : deploy.js
@Time    : 2021/12/16 11:22:03
@Version : 0.1
@License : Apache License Version 2.0, January 2004
@Desc    : None
 */
const util = require("./helper")
const fs = require("fs")
const path = require('path');
const vscode = require("vscode")
const client = require("node-sshclient");
const zipFolder = require('zip-folder')
class Deploy {
    constructor() {
        this.syncToRemote = this.syncToRemote.bind(this);
        this.syncAll = this.syncAll.bind(this);
        this.newCfg = this.newCfg.bind(this);
        this.scpTrans = this.scpTrans.bind(this);
        this.deleteFromRemote = this.deleteFromRemote.bind(this);
        this.root_path = vscode.workspace.workspaceFolders[0]["uri"]["_fsPath"];
        this.cfpath = this.root_path + "/.vscode/scp.json";
        this.options = {}
        this.readCfg()
    }
    makCfg(cfname) {
        fs.writeFile(cfname, `{
    "host": "LocalHost",
    "port": 22,
    "user": "root",
    "ignore":[".git",".vscode"],
    "remotePath": "/root",
    "uploadOnSave": true
}`, (err) => {
            if (err) {
                vscode.window.showInformationMessage(`配置文件创建失败`)
            } else {
                vscode.window.showInformationMessage(`创建配置文件成功`)
                vscode.workspace.openTextDocument(cfname).then(
                    document => vscode.window.showTextDocument(document));
            }
        })
    }
    newCfg() {
        let dirname = this.root_path + "/.vscode"
        let cfname = this.root_path + "/.vscode/scp.json"
        if (!fs.existsSync(dirname)) {
            fs.mkdir(dirname, (direrr) => {
                if (direrr) {
                    vscode.window.showInformationMessage(`创建文件夹：${dirname}失败 `)
                } else {
                    if (!fs.existsSync(cfname)) {
                        this.makCfg(cfname)
                    }
                }
            })
        } else {
            if (!fs.existsSync(cfname)) {
                this.makCfg(cfname)
            }
        }
    }
    readCfg() {
        if (fs.existsSync(this.cfpath)) {
            const that = this;
            fs.readFile(this.cfpath, (err, data) => {
                if (err) {
                    console.log(err)
                } else {
                    this.config = JSON.parse(data.toString("utf-8"))
                        // 检测根目录和配置是否可用
                    try {
                        if (this.config["host"].indexOf(".") != -1) {
                            this.sshCommand(`cd ${this.config["remotePath"]}`).then((result) => {
                                if (result["stderr"]) {
                                    that.sshCommand(`mkdir ${that.config["remotePath"]}`).then((res) => {
                                        if (res["stderr"]) {
                                            vscode.window.showErrorMessage(res["stderr"])
                                        } else {
                                            vscode.window.showInformationMessage(`远程文件夹${that.config["remotePath"]}创建成功`)
                                        }
                                    })
                                }
                            })
                        }
                    } catch (error) {
                        vscode.window.showErrorMessage(error)
                    }
                }
            })
        }
    }
    sshCommand(command) {
        const that = this;
        that.options = {
            "hostname": that.config["host"],
            "port": parseInt(that.config["port"]),
            "user": that.config["user"]
        }
        return new Promise((resolve) => {
            const ssh = new client.SSH(that.options)
            ssh.command(command, (result) => {
                resolve(result)
            })
        })
    }
    scpTrans(local_path, remote_path) {
        const that = this;
        return new Promise((resolve) => {
            that.options = {
                "hostname": that.config["host"],
                "port": parseInt(that.config["port"]),
                "user": that.config["user"]
            }
            const scp = new client.SCP(that.options)
            that.sshCommand(`cd ${remote_path}`).then((result) => {
                if (result["stderr"]) {
                    this.sshCommand(`mkdir ${remote_path}`).then((res) => {
                        if (res["stderr"]) {
                            vscode.window.showErrorMessage(res["stderr"])
                            resolve(false)
                        } else {
                            scp.upload(local_path, remote_path, (result) => {
                                if (result["stderr"]) {
                                    vscode.window.showErrorMessage(result["stderr"])
                                    resolve(false)
                                }
                                resolve(true)
                            })
                        }
                    })
                } else {
                    scp.upload(local_path, remote_path, (result) => {
                        if (result["stderr"]) {
                            vscode.window.showErrorMessage(result["stderr"])
                            resolve(false)
                        }
                        resolve(true)
                    })
                }
            })
        })
    }
    syncToRemote({ fileName }) {
        const that = this;
        this.scpToRemote(fileName).then((res) => {
            let remote_path = fileName.replace(that.root_path, "").replace(/[\\]/g, '/')
            if (res["code"] == 200) {
                vscode.window.showInformationMessage(`同步成功：${remote_path}`)
            } else {
                if (res["code"] == 2) {
                    vscode.window.showErrorMessage(`同步失败：${remote_path}`)
                }
            }
        })
    }
    scpToRemote(fileName) {
        /***
         * code:
         * 0:表示缺少远程地址
         * 1. 
         */
        const that = this;
        return new Promise((resolve) => {
            if (fs.existsSync(that.cfpath) && that.config["host"] && that.config["host"].indexOf(".") != -1) {
                that.readCfg()
                if (that.config["uploadOnSave"]) {
                    if (!that.config["remotePath"]) {
                        vscode.window.showErrorMessage("配置文件缺少remotePath,请填写完整")
                        resolve({
                            "status": false,
                            "code": 0
                        })
                    }
                    let local_path = fileName
                    let remote_path = path.dirname(fileName.replace(that.root_path, that.config["remotePath"]).replace(/[\\]/g, '/'))
                    if (local_path.indexOf(".vscode") != -1) {
                        resolve({
                            "status": false,
                            "code": 1
                        })
                    }
                    let dir_list = local_path.split("\\")
                    if (that.config["ignore"] && that.config["ignore"].length > 0) {
                        for (let i = 0; i < that.config["ignore"].length; i++) {
                            let dir = that.config["ignore"][i]
                            for (let j = 0; j < dir_list.length; j++) {
                                let fdir = dir_list[j]
                                if (dir == fdir) {
                                    resolve({
                                        "status": false,
                                        "code": 0
                                    })
                                }
                            }

                        }
                        that.scpTrans(local_path, remote_path).then((flag) => {
                            if (flag) {
                                resolve({
                                    "status": true,
                                    "code": 200
                                })
                            }
                            resolve({
                                "status": false,
                                "code": 2
                            })
                        })
                    } else {
                        that.scpTrans(local_path, remote_path).then((flag) => {
                            if (flag) {
                                resolve({
                                    "status": true,
                                    "code": 200
                                })
                            }
                            resolve({
                                "status": false,
                                "code": 2
                            })
                        })
                    }

                }
            }
        })
    }
    deleteFromRemote(files) {
        console.log(files)
    }

    syncAll() {
        const that = this;
        const zip_path = `${this.root_path}/tmp.zip`
        zipFolder(that.root_path, zip_path, (err) => {
            if (!err) {
                that.scpToRemote(zip_path).then((res) => {
                    fs.unlinkSync(zip_path)
                    switch (res["code"]) {
                        case 0:
                            break;
                        case 1:
                            break;
                        case 2:
                            vscode.window.showErrorMessage("本地代码和远程代码同步失败")
                            break;
                        default:
                            const remote_path = that.config["remotePath"]
                            that.sshCommand(`unzip -o ${remote_path}/tmp.zip -d ${remote_path}/`).then((result) => {
                                if (!result["stderr"]) {
                                    that.sshCommand(`rm -rf ${remote_path}/tmp.zip`)
                                    vscode.window.showInformationMessage("本地代码和远程代码同步成功")
                                }
                            })
                    }
                })
            }
        })
    }
    deactivate() {
        util.channel.dispose();
    }
}

module.exports = Deploy;