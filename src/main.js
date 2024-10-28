const core = require('@actions/core')
const axiosNode = require('axios');
const API_END_POINT = {
	deployApp: 'https://api.deploys.app/deployment',
	telegramBot: 'https://api.telegram.org',
	clickUp: 'https://api.clickup.com/api/v2'

}

var countStepProcessing = 1;

var axiosConfigDeployApp = {
	url: '',
	headers: {
		'Content-Type': 'application/json',
	},
	auth: {

	}
};

var axiosConfigTelegramBot = {
	url: '',
	headers: {
		'Content-Type': 'application/json',
	}
};

var axiosConfigClickUp = {
	url: '',
	headers: {
		'Content-Type': 'application/json',
		'Authorization': ''
	}
};

const masterDeployAppBodyRequest = {
	"project": "",
	"location": "",
	"name": "",
	"type": "WebService",
	"image": "",
	"pullSecret": "",
	"workloadIdentity": "",
	"port": 8080,
	"protocol": "http",
	"internal": false,
	"command": [],
	"args": [],
	"schedule": "",
	"disk": {
		"name": "",
		"mountPath": "",
		"subPath": ""
	},
	"minReplicas": 1,
	"maxReplicas": 1,
	"resources": {
		"requests": {
			"memory": "0"
		},
		"limits": {
			"memory": ""
		}
	},
	"env": {
	},
	"mountData": {},
	"sidecar": {
		"type": "",
		"cloudSqlProxy": {
			"instance": "",
			"port": null,
			"credentials": ""
		}
	},
	"sidecars": []
}

const DeployActionEnum = {
	deploy: 'deploy',
	delete: 'delete',
}

async function axios(config, functionName) {
	// core.info(`API Request ${functionName}`)
	// core.info(`API Config ${JSON.stringify(config)}`)
	const res = await axiosNode(config)
		.then(function (response) {
			core.info(`Call Step ${countStepProcessing++} : ${functionName} ✅`)
			// core.info(`Api Response ${JSON.stringify(response.data)}`)
			return response.data
		})
		.catch(function (error) {
			core.info(`Call ${functionName} Not ✅`)
			core.info(JSON.stringify(error))
			return null
		});
	return res
}

class DeployHandler {
	async main(req) {
		switch (req.type) {
			case DeployActionEnum.deploy:
				this.deploy(req)
				break
			case DeployActionEnum.delete:
				this.delete(req)
				break
		}
	}

	async deploy(req) {
		axiosConfigDeployApp = {
			...axiosConfigDeployApp,
			...{
				url: API_END_POINT.deployApp + '.get',
				method: 'post',
				data: JSON.stringify({
					project: req.project,
					location: req.location,
					name: req.from
				})
			}
		}

		const resGet = await axios(axiosConfigDeployApp, 'Get Env Master Project')
		if (!resGet) {
			return false
		}

		core.info(`Info ENV ${resGet.result.env}`)
		axiosConfigDeployApp = {
			...axiosConfigDeployApp,
			...{
				url: API_END_POINT.deployApp + '.deploy',
				method: 'post',
				data: JSON.stringify({
					...masterDeployAppBodyRequest,
					...{
						project: req.project,
						location: req.location,
						name: req.name,
						image: req.image,
						minReplicas: Number(req.minReplicas) || 1,
						maxReplicas: Number(req.maxReplicas) || 1,
						env: resGet.result.env
					}
				})
			}
		}

		const resDeploy = await axios(axiosConfigDeployApp, 'Deploy Project')
		if (!resDeploy) {
			return false
		}

		axiosConfigDeployApp = {
			...axiosConfigDeployApp,
			...{
				url: API_END_POINT.deployApp + '.get',
				method: 'post',
				data: JSON.stringify({
					project: req.project,
					location: req.location,
					name: req.name
				})
			}
		}

		const resGetUrl = await axios(axiosConfigDeployApp, 'Get URL Project')

		core.info(`URL ${resGetUrl.result.url}`)

		if (req.tokenTelegram != '' && req.chatIdTelegram != '') {
			axiosConfigTelegramBot = {
				...axiosConfigTelegramBot,
				...{
					url: API_END_POINT.telegramBot + '/bot' + req.tokenTelegram + '/sendMessage',
					method: 'post',
					data: JSON.stringify({
						chat_id: req.chatIdTelegram,
						text: `🚀 : ${req.name} ✅\n🌐 URL For Test: ${resGetUrl.result.url}`
					})
				}
			}

			const resSendMessageTelegram = await axios(axiosConfigTelegramBot, 'Send Message Telegram')
			if (!resSendMessageTelegram) {
				return false
			}
		}

		if (!resGetUrl) {
			return false
		}

		return true
	}

	async delete(req) {
		axiosConfigDeployApp = {
			...axiosConfigDeployApp,
			...{
				url: API_END_POINT.deployApp + '.delete',
				method: 'post',
				data: JSON.stringify({
					project: req.project,
					location: req.location,
					name: req.name
				})
			}
		}

		const res = await axios(axiosConfigDeployApp, 'Delete Form Project')
		if (!res) {
			return false
		}

		if (req.tokenTelegram != '' && req.chatIdTelegram != '') {
			axiosConfigTelegramBot = {
				...axiosConfigTelegramBot,
				...{
					url: API_END_POINT.telegramBot + '/bot' + req.tokenTelegram + '/sendMessage',
					method: 'post',
					data: JSON.stringify({
						chat_id: req.chatIdTelegram,
						text: `🗑️: ${req.name} ✅`
					})
				}
			}

			const resSendMessageTelegram = await axios(axiosConfigTelegramBot, 'Send Message Telegram')

			if (!resSendMessageTelegram) {
				return false
			}
		}

		return true
	}
}

async function run() {
	try {
		const inputs = {
			project: core.getInput('project'),
			location: core.getInput('location'),
			name: core.getInput('name'),
			image: core.getInput('image'),
			type: core.getInput('type'),
			from: core.getInput('from'),
			minReplicas: core.getInput('minReplicas'),
			maxReplicas: core.getInput('maxReplicas'),
			portDeployApp: core.getInput('portDeployApp'),
			tokenTelegram: core.getInput('tokenTelegram'),
			chatIdTelegram: core.getInput('chatIdTelegram'),
			clickUpToken: core.getInput('clickUpToken'),
			clickUpTeamId: core.getInput('clickUpTeamId'),
			DEPLOYS_AUTH_USER: process.env.DEPLOYS_AUTH_USER,
			DEPLOYS_AUTH_PASS: process.env.DEPLOYS_AUTH_PASS,
		}

		core.info('Started API Deploys 🚀')

		const deployHandler = new DeployHandler()

		axiosConfigDeployApp.auth = {
			username: inputs.DEPLOYS_AUTH_USER,
			password: inputs.DEPLOYS_AUTH_PASS
		}

		masterDeployAppBodyRequest.port = Number(inputs.portDeployApp)

		await deployHandler.main(inputs)

	} catch (error) {
		core.setFailed(error.message)
	}
}

run()