const core = require('@actions/core')
const axiosNode = require('axios');

var axiosConfigDeployApp = {
	url: 'https://console.deploys.app/api/deployment',
	headers: {
		'content-type': 'application/json',
		'cookie': 'token=deploys-api.l3DQqHOb-6PAPZFbstoBIFYZOvjYEKn5wgZxS7wU25M;'
	},
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
	"maxReplicas": 4,
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
	core.info(`API Data ${JSON.stringify(config)}`)
	await axiosNode(config)
		.then(function (response) {
			core.info(`Call ${functionName} Success`)
			core.info(JSON.stringify(response.data))
			return response.data
		})
		.catch(function (error) {
			core.info(`Call ${functionName} Not Success`)
			core.info(JSON.stringify(error))
			return error
		});
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
				url: axiosConfigDeployApp.url + '.get',
				method: 'get',
				data: JSON.stringify({
					project: req.project,
					location: req.location,
					name: req.name
				})
			}
		}

		const resGet = await axios(axiosConfigDeployApp, 'Get Env Form Project')

		if (resGet.ok) {
			axiosConfigDeployApp = {
				...axiosConfigDeployApp,
				...{
					url: axiosConfigDeployApp.url + '.deploy',
					method: 'post',
					data: JSON.stringify({
						...masterDeployAppBodyRequest,
						...{
							project: req.project,
							location: req.location,
							name: req.name,
							image: req.image,
							minReplicas: req.minReplicas,
							maxReplicas: req.maxReplicas,
							env: resGet.from
						}
					})
				}
			}
			const resDeploy = await axios(axiosConfigDeployApp, 'Deploy Env Form Project')
			if (resDeploy.ok) {
				return true
			} else {
				return false
			}
		} else {
			return false
		}
	}

	async delete(req) {
		axiosConfigDeployApp = {
			...axiosConfigDeployApp,
			...{
				url: axiosConfigDeployApp.url + '.delete',
				method: 'post',
				data: JSON.stringify({
					project: req.project,
					location: req.location,
					name: req.name
				})
			}
		}
		const res = await axios(axiosConfigDeployApp, 'Delete Form Project')
		if (res.ok) {
			return true
		} else {
			return false
		}
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
		}
		core.info('Started API Deploys')
		core.info(`Request inputs:${JSON.stringify(inputs)}`)
		const deployHandler = new DeployHandler()
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
