import mongoose from 'mongoose'
const User = mongoose.model('User');
const Camp = mongoose.model('Camp');
import Queue from '../lib/Queue'

exports.createCamp = async (req, res) => {

    // header = (sessionID: '')
    // body = {
    //     campType = ''
    // }

    User.findById(req.cookies['sessionID']).then(data => {
        if (data == null || Object.keys(data).length == 0) {
            res.clearCookie('sessionID', { path: '/' })
            return res.status(404).send()
        }
        if (!data.admin) return res.status(401).send({ code: 401, sucess: false })

        new Camp(req.body).save().then(async message => {
            var listaEmails = []
            await User.find({}, {_id: 0, email: 1}).then(async emails => {
                emails.forEach(element => {
                    listaEmails.push(element.email)
                });
            }).catch(() => {
                return res.status(500).send({ code: 500, sucess: false})
            })

            listaEmails.forEach(email => {
                Queue.add('NewCampMail', { email: email, gameName: req.body.campType.charAt(0).toUpperCase() + req.body.campType.slice(1), campLink: `https://radicalteen.com.br/campeonato.html?j=${req.body.campType}&id=${message.id}` })
            })

            User.updateMany({}, {$push: {notification: {title: `Um campeonato de ${req.body.campType.charAt(0).toUpperCase() + req.body.campType.slice(1)} foi criado!`, text: `Se inscreva agora mesmo! https://radicalteen.com.br/campeonato.html?j=${req.body.campType}&id=${message.id}`}}})
            return res.status(201).send({ code: 201, sucess: true, id: message.id })
        }).catch(() => {
            return res.status(400).send({ code: 400, sucess: false, error: error })
        })
    }).catch(() => {
        res.clearCookie('sessionID', { path: '/' })
        return res.status(401).send({ code: 401, sucess: false, error: 'Invalid SessionID' })
    })
}

exports.inscriçãoCamp = (req, res) => {

    // header = {sessionID: ''}
    // body = {
    //     campID: '',
    //     comprovante: ''
    // }

    Camp.findById(req.body.campID).then(dataCamp => {
        if ((!dataCamp.inscricoesOn) || (dataCamp['listaPlayers'].length >= dataCamp.maxPlayers && dataCamp.maxPlayers != "0")) {
            if (dataCamp.inscricoesOn) {
                dataCamp.inscricoesOn = false
                Camp.replaceOne({ _id: req.body.campID }, dataCamp).then()
            }
            return res.status(200).send({ code: 200, sucess: false, error: 'Fim das inscricoes' })
        }

        User.findById(req.cookies['sessionID']).then(dataUser => {
            if (dataUser == null || Object.keys(dataUser).length == 0) {
                res.clearCookie('sessionID', { path: '/' })
                return res.status(404).send()
            }
            if (!dataUser.active) return res.status(401).send({ code: 401, sucess: false })

            var find = false
            dataCamp['listaPlayers'].forEach(value => {
                if (value.id == req.cookies['sessionID']) {
                    find = true
                    return res.status(409).send({ code: 409, sucess: false, error: 'Ja cadastrado' })
                }
            });
            if (!find) {
                dataCamp['listaPlayers'].push({ id: req.cookies['sessionID'], status: false, comprovante: req.body.comprovante })
                Camp.replaceOne({ _id: req.body.campID }, dataCamp).then(() => {
                    Queue.add('PaymentReviewMail', { email: dataUser.email, gameName: dataCamp.campType.charAt(0).toUpperCase() + dataCamp.campType.slice(1) })
                    User.findByIdAndUpdate(req.cookies['sessionID'], {$push: {notification: {title: "Seu pagamento está em análise!", text: `O pagamento do campeonato ${dataCamp.nome} está em análise`}}})
                    return res.status(200).send({ code: 200, sucess: true })
                }).catch(() => {
                    return res.status(500).send({ code: 500, sucess: false })
                })
            }
        }).catch(() => {
            res.clearCookie('sessionID', { path: '/' })
            return res.status(400).send({ code: 400, sucess: false })
        })
    }).catch(() => {
        return res.status(400).send({ code: 400, sucess: false, error: 'Campeonato nao encontrado' })
    })
}

exports.editStatus = (req, res) => {

    // header = {sessionID: ''}
    // body = {
    //     userID: '',
    //     campID: ''
    // }

    User.findById(req.cookies['sessionID']).then(dataAdmin => {
        if (dataAdmin == null || Object.keys(dataAdmin).length == 0) {
            res.clearCookie('sessionID', { path: '/' })
            return res.status(404).send()
        }
        if (!dataAdmin.admin) return res.status(401).send()

        User.findById(req.body.userID).then(dataUser => {
            if (dataUser == null || Object.keys(dataUser).length == 0) return res.status(404).send()

            Camp.findById(req.body.campID).then(dataCamp => {
                if (dataCamp == null || Object.keys(dataCamp).length == 0) return res.status(404).send()

                var find = false
                dataCamp.listaPlayers.forEach(value => {
                    if (value.id == req.body.userID) {
                        value.status = true
                        find = true
                    }
                });
                if (!find) return res.status(404).send()
                Camp.replaceOne({ _id: req.body.campID }, dataCamp).then(() => {
                    Queue.add('PaymentApprovedMail', { email: dataUser.email, gameName: dataCamp.campType.charAt(0).toUpperCase() + dataCamp.campType.slice(1) })
                    User.findByIdAndUpdate(req.body.userID, {$push: {notification: {title: "Seu pagamento foi aprovado!", text: `O pagamento do campeonato ${dataCamp.nome} foi aprovado!`}}})
                    return res.status(200).send()
                }).catch(() => {
                    return res.status(500).send()
                })
            }).catch(() => {
                return res.status(400).send()
            })
        }).catch(() => {
            return res.status(400).send()
        })
    }).catch(() => {
        res.clearCookie('sessionID', { path: '/' })
        return res.status(400).send()
    })
}

exports.deleteUser = (req, res) => {

    // header = {sessionID: ''}
    // body = {
    //     userID: '',
    //     campID: ''
    // }

    User.findById(req.cookies['sessionID']).then(dataAdmin => {
        if (dataAdmin == null || Object.keys(dataAdmin).length == 0) {
            res.clearCookie('sessionID', { path: '/' })
            return res.status(404).send()
        }
        if (!dataAdmin.admin) return res.status(401).send()

        User.findById(req.body.userID).then(dataUser => {
            if (dataUser == null || Object.keys(dataUser).length == 0) return res.status(404).send()

            Camp.findById(req.body.campID).then(dataCamp => {
                if (dataCamp == null || Object.keys(dataCamp).length == 0) return res.status(404).send()

                var find = false
                dataCamp.listaPlayers.forEach((value, i) => {
                    if (value.id == req.body.userID) {
                        dataCamp['listaPlayers'].splice(i, 1)
                        find = true
                    }
                });
                if (!find) return res.status(404).send()
                Camp.replaceOne({ _id: req.body.campID }, dataCamp).then(() => {
                    Queue.add('PaymentRefusedMail', { email: dataUser.email, gameName: dataCamp.campType.charAt(0).toUpperCase() + dataCamp.campType.slice(1), campLink: `https://radicalteen.com.br/campeonato.html?j=${dataCamp.campType}&id=${dataCamp.id}` })
                    User.findByIdAndUpdate(req.body.userID, {$push: {notification: {title: "Seu pagamento foi recusado.", text: `O pagamento do campeonato ${dataCamp.nome} foi recusado, tente se inscrever novamente ou entre em contato com um administrador.`}}})
                    return res.status(200).send()
                }).catch(() => {
                    return res.status(500).send()
                })
            }).catch(() => {
                return res.status(400).send()
            })
        }).catch(() => {
            return res.status(400).send()
        })
    }).catch(() => {
        res.clearCookie('sessionID', { path: '/' })
        return res.status(400).send()
    })
}

exports.editCamp = (req, res) => {

    // header = {sessionID: ''}
    // body = {
    //     campID: '',
    //     nome: '',
    //     data: '',
    //     hora: '',
    //     maxPlayers: '',
    //     limiteDataInscricoes: '',
    //     inscricoesOn: '',
    //     premiacao: '',
    //     inscricao: '',
    //     campType: '',
    //     info: '',
    //     regras: ''
    // }

    User.findById(req.cookies['sessionID']).then(userData => {
        if (userData == null || Object.keys(userData).length == 0) {
            res.clearCookie('sessionID', { path: '/' })
            return res.status(404).send()
        }
        if (!userData.admin) return res.status(401).send()
        campID = req.body.campID
        delete req.body.campID
        Camp.findByIdAndUpdate({ _id: campID}, {$set: req.body}).then(data => {
            if (data === null || Object.keys(data).length == 0) {
                return res.status(500).send()
            }
            return res.status(201).send()
        }).catch(() => {
            return res.status(400).send()
        })
    }).catch(() => {
        return res.status(400).send()
    })
}

exports.deleteCamp = (req, res) => {

    // header = {sessionID: ''}
    // body = {
    //     campID: ''
    // }

    User.findById(req.cookies['sessionID']).then(data => {
        if (data == null || Object.keys(data).length == 0) {
            res.clearCookie('sessionID', { path: '/' })
            return res.status(404).send()
        }
        if (!data.admin) return res.status(401).send()

        Camp.deleteOne({ _id: req.body.campID }).then(() => {
            return res.status(200).send()
        }).catch(() => {
            return res.status(404).send()
        })
    }).catch(() => {
        res.clearCookie('sessionID', { path: '/' })
        return res.status(400).send()
    })
}

exports.allCamps = (req, res) => {
    var payload = {}
    if (Object.keys(req.query).length != 0) {
        payload = { campType: req.query.tag }
    }
    Camp.find(payload).then(data => {
        data.forEach(value => { value.listaPlayers = undefined })
        return res.status(200).send(data)
    }).catch(() => {
        return res.status(500).send()
    })
}

exports.getCamp = (req, res) => {

    if (req.query.id == undefined) return res.status(400).send()

    Camp.findById(req.query.id).then(async camp => {
        if (camp == null) return res.status(400).send()
        listaUsers = []
        for await (user of camp.listaPlayers) {
            if (user.status){
                await User.findById(user.id, {_id: 0}).then(user => {
                    listaUsers.push(user.usuario)
                }).catch(() => {
                    return res.status(500).send()
                })
            }
        }
        camp.listaPlayers = listaUsers
        return res.status(200).send(camp)
    }).catch(() => {
        return res.status(400).send()
    })
}

exports.getCampAdmin = (req, res) => {

    // header = {sessionID: ''}
    // body = {
    //     campID: ''
    // }

    User.findById(req.cookies['sessionID']).then(async dataAdmin => {
        if (dataAdmin == null || Object.keys(dataAdmin).length == 0) {
            res.clearCookie('sessionID', { path: '/' })
            return res.status(404).send()
        }
        if (!dataAdmin.admin) return res.status(401).send()

        Camp.findById(req.body.campID, { _id: 0 }).then(async dataCamp => {
            if (dataCamp == null || Object.keys(dataCamp).length == 0) return res.status(404).send()
            var infoUsers = []
            for await (user of dataCamp.listaPlayers) {
                await User.findById(user.id).then(dataUser => {
                    infoUsers.push({ id: dataUser.id, nome: dataUser.nome, user: dataUser.usuario, email: dataUser.email, cel: dataUser.cel, status: user.status, comprovante: user.comprovante })
                })
            }
            dataCamp.listaPlayers = infoUsers
            return res.status(200).send(dataCamp)
        }).catch(() => {
            return res.status(400).send()
        })
    }).catch(() => {
        res.clearCookie('sessionID', { path: '/' })
        return res.status(400).send()
    })
}