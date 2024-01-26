const core = require('@actions/core')
const exec = require('@actions/exec')
const installer = require('./installer')

const deployProjectEnv = {
	"API_URL": "http://admin-service-779241746755715105.internal.rcf2.deploys.app",
	"BASE_WORKER_URL": "https://stag-worker.2berich.us",
	"GCP_STORAGE_BASE_URL": "https://i.2berich.us",
	"HANDY_SMS_DOWNLOAD_URL": "http://bit.ly/3zKT3Ku",
	"IS_MOCK_SERVER": "false",
	"KBANK_PLUS_DOWNLOAD_URL": "https://shorturl.asia/zxAu2",
	"PLAYER_CENTER_URL": "https://2berich.us/",
	"REVERSE_PROXY_CNAME_LIST": "[\"c1.2berich.xyz\", \"c2.2berich.xyz\"]"
}

const DeployActionEnum = {
	deploy: 'deploy',
	get: 'get',
	delete: 'delete',
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
		}

		const deployApp = await installer.install()
		core.info('Deploys CLI installed successfully')
		core.info(`Request inputs:${JSON.stringify(inputs)}`)

		const deployHandler = new DeployHandler()
		let cmd = await deployHandler.main(inputs, deployApp)

		if (!!cmd) {
			await execCmd(cmd, inputs.type)
		} else {
			core.info(`Invalid Data or Type`)
		}
	} catch (error) {
		core.setFailed(error.message)
	}
}

async function execCmd(cmd, type) {
	core.info(`Deploying Type : ${type}`)
	await exec.exec(cmd)
	core.info(`Processing is Successfully : ${type}`)
}

class DeployHandler {
	async main(req, deployApp) {
		let cmd = undefined
		switch (req.type) {
			case DeployActionEnum.deploy:
				cmd = this.deploy(req, deployProjectEnv, deployApp)
				break
			case DeployActionEnum.delete:
				cmd = this.delete(req, deployApp)
				break
			default:
				cmd = undefined
				break
		}
		return cmd
	}

	get(req, deployApp) {
		return `${deployApp} deployment ${DeployActionEnum.get} -location=${req.location} -project=${req.project} -name=${req.from}`
	}

	deploy(req, env, deployApp) {
		return `${deployApp} deployment ${DeployActionEnum.deploy} -location=${req.location} -project=${req.project} -name=${req.name} -image=${req.image} -addEnv=${env}`
	}

	delete(req, deployApp) {
		return `${deployApp} deployment ${DeployActionEnum.delete} -location=${req.location} -project=${req.project} -name=${req.name}`
	}
}

await run()
