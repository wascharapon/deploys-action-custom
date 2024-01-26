const core = require('@actions/core')
const exec = require('@actions/exec')
const installer = require('./installer')

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
	let res = await exec.exec(cmd)
	core.info(`Processing is Successfully : ${res}`)
	return res
}

class DeployHandler {
	async main(req, deployApp) {
		let cmd = undefined
		switch (req.type) {
			case DeployActionEnum.deploy:
				const { env } = await execCmd(this.get(req, deployApp), DeployActionEnum.get)
				cmd = this.deploy(req, env, deployApp)
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

	deploy(req, env, deployApp) {
		return `${deployApp} deployment ${DeployActionEnum.deploy} -location=${req.location} -project=${req.project} -name=${req.name} -image=${req.image} -AddEnv=${env}`
	}

	get(req, deployApp) {
		return `${deployApp} deployment ${DeployActionEnum.get} -location=${req.location} -project=${req.project} -name=${req.name}`
	}

	delete(req, deployApp) {
		return `${deployApp} deployment ${DeployActionEnum.delete} -location=${req.location} -project=${req.project} -name=${req.from}`
	}
}

const DeployActionEnum = {
	deploy: 'deploy',
	get: 'get',
	delete: 'delete',
}

await run()
