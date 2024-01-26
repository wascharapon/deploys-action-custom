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
	core.info(`Processing is Successfully`)
	return res
}

class DeployHandler {
	async main(req, deployApp) {
		let cmd = undefined
		switch (req.type) {
			case DeployActionEnum.deploy:
				let { Env } = await execCmd(this.get(req, deployApp), req.type)
				cmd = this.deploy(req, Env, deployApp)
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

	deploy(req, Env, deployApp) {
		return `${deployApp} deployment ${req.type} -location=${req.location} -project=${req.project} -name=${req.name} -image=${req.image} -AddEnv=${Env}`
	}

	get(req, deployApp) {
		return `${deployApp} deployment ${req.type} -location=${req.location} -project=${req.project} -name=${req.name}`
	}

	delete(req, deployApp) {
		return `${deployApp} deployment ${req.type} -location=${req.location} -project=${req.project} -name=${req.from}`
	}
}

const DeployActionEnum = {
	deploy: 'deploy',
	delete: 'delete',
}

await run()
