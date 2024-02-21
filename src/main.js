const core = require('@actions/core')
const axiosNode = require('axios');
const API_END_POINT = {
	deployApp: 'https://console.deploys.app/api/deployment',
	telegramBot: 'https://api.telegram.org',
	clickUp: 'https://api.clickup.com/api/v2'

}

var countStepProcessing = 1;

var axiosConfigDeployApp = {
	url: '',
	headers: {
		'content-type': 'application/json',
		'cookie': 'token='
	},
};

var axiosConfigTelegramBot = {
	url: '',
	headers: {
		'content-type': 'application/json',
	}
};

var axiosConfigClickUp = {
	url: '',
	headers: {
		'content-type': 'application/json',
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
	core.info(`API Request ${functionName}`)
	core.info(`API Config ${JSON.stringify(config)}`)
	const res = await axiosNode(config)
		.then(function (response) {
			core.info(`Call Step ${countStepProcessing++} : ${functionName} Success`)
			core.info(`Api Response ${JSON.stringify(response.data)}`)
			return response.data
		})
		.catch(function (error) {
			core.info(`Call ${functionName} Not Success`)
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

		if (!resGetUrl) {
			return false
		}

		if (req.clickUpToken != '' && req.clickUpTeamId != '') {
			axiosConfigClickUp.headers.Authorization = req.clickUpToken

			axiosConfigClickUp = {
				...axiosConfigClickUp,
				...{
					url: API_END_POINT.clickUp + '/team/' + req.clickUpTeamId + '/task',
					method: 'get',
				}
			}

			const teamTask = await axios(axiosConfigClickUp, 'Get Team Task ClickUp')

			const custom_id = req.name.split(req.from + '-')[1].toUpperCase();

			core.info(`Custom ID ${custom_id}`)

			const task = teamTask.tasks.find((task) => task.custom_id === custom_id)

			if (!task) {
				core.info(`Checklist SubTask`)
				await teamTask.tasks.forEach(async (task) => {
					core.info(`Task ID ${task.id}`)
					axiosConfigClickUp = {
						...axiosConfigClickUp,
						...{
							url: API_END_POINT.clickUp + '/team/' + req.clickUpTeamId + '/task?page=&parent=' + task.id,
							method: 'get',
						}
					}
					const resSubTask = await axios(axiosConfigClickUp, 'Get SubTask ClickUp')

					if (!resSubTask) {
						return false
					}

					const subtask = resSubTask.tasks.find((task) => task.custom_id === custom_id)

					if (!subtask) {
						return false
					}

					task = subtask
				})
			}

			core.info(`Task ID ${task.id}`)

			axiosConfigClickUp = {
				...axiosConfigClickUp,
				...{
					url: API_END_POINT.clickUp + '/task/' + task.id + '/comment',
					method: 'post',
					data: JSON.stringify({
						comment_text: `Deploy ${req.name} Success URL: ${resGetUrl.result.url}`,
						notify_all: true
					})
				}
			}

			const resCreateCommentClickUp = await axios(axiosConfigClickUp, 'Create Comment ClickUp')

			if (!resCreateCommentClickUp) {
				return false
			}

		}

		if (req.tokenTelegram != '' && req.chatIdTelegram != '') {
			axiosConfigTelegramBot = {
				...axiosConfigTelegramBot,
				...{
					url: API_END_POINT.telegramBot + '/bot' + req.tokenTelegram + '/sendMessage',
					method: 'post',
					data: JSON.stringify({
						chat_id: req.chatIdTelegram,
						text: task ?
							`Deploy:${task.name} Success \n URL ClickUp:${task.url} \n URL For Test: ${resGetUrl.result.url}` :
							`Deploy:${req.name} Success \n URL For Test: ${resGetUrl.result.url}`
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
						text: `Delete:${req.name} Success`
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
			tokenDeployApp: core.getInput('tokenDeployApp'),
			portDeployApp: core.getInput('portDeployApp'),
			tokenTelegram: core.getInput('tokenTelegram'),
			chatIdTelegram: core.getInput('chatIdTelegram'),
			clickUpToken: core.getInput('clickUpToken'),
			clickUpTeamId: core.getInput('clickUpTeamId'),
		}

		core.info('Started API Deploys')
		core.info(`Request inputs:${JSON.stringify(inputs)}`)

		const deployHandler = new DeployHandler()

		axiosConfigDeployApp.headers.cookie = `token=${inputs.tokenDeployApp}`
		masterDeployAppBodyRequest.port = Number(inputs.portDeployApp)

		const res = await deployHandler.main(inputs)
		if (res) {
			core.info(`Deploy is success`)
		} else {
			core.info(`Deploy is not success`)
		}
	} catch (error) {
		core.setFailed(error.message)
	}
}

run()