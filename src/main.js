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
		core.info('Deploys CLI installed sucessfully')

		let cmd = await deploy.main(inputs, deployApp)

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

async function deploy() {
	this.main = async function (req, deployApp) {
		let cmd = undefined
		switch (req.type) {
			case DeployActionEnum.create:
				let { Env } = await execCmd(this.get(req, deployApp), req.type)
				cmd = this.create(req, Env, deployApp)
				break
			case DeployActionEnum.delete:
				cmd = this.delete(req, deployApp)
				break
			default: cmd = undefined
				break
		}
		return cmd
	}

	this.create = function (req = IDeploy.create(), Env, deployApp) {
		return `${deployApp} deployment ${req.type}-location=${req.location} -project=${req.project} -name=${req.name} -image=${req.image} -AddEnv=${Env}`
	}
	this.get = function (req = IDeploy.get(), deployApp) {
		return `${deployApp} deployment ${req.type} -location=${req.location} -project=${req.project} -name=${req.name}`
	}
	this.delete = function (req = IDeploy.delete(), deployApp) {
		return `${deployApp} deployment ${req.type} -location=${req.location} -project=${req.project} -name=${req.from}`
	}
}

const DeployActionEnum = {
	create: 'create',
	delete: 'delete',
	get: 'get',
}

function IDeploy() {
	this.create = function () {
		return {
			location: undefined,
			project: undefined,
			name: undefined,
			image: undefined,
		}
	}
	this.get = function () {
		return {
			location: undefined,
			project: undefined,
			name: undefined,
		}
	}
	this.delete = function () {
		return {
			location: undefined,
			project: undefined,
			from: undefined,
		}
	}
}

await run()
