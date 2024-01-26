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
			to: core.getInput('to'),
		}

		const deployApp = await installer.install()
		core.info('Deploys CLI installed sucessfully')
		
		let cmd = await deploy.main(inputs, deployApp)

		if (!!cmd) {
			core.info('Deploying Type : ' + inputs.type)
			await exec.exec(cmd)
			core.info(`Processing is Successfully`)
		} else {
			core.info(`Invalid Data or Type`)
		}
	} catch (error) {
		core.setFailed(error.message)
	}
}


async function deploy() {
	this.main = async function (req, deployApp) {
		let cmd = undefined
		switch (type) {
			case DeployActionEnum.create:
				let { Env } = await exec.exec(this.get(req, deployApp))
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
		return `${deployApp} deployment ${req.type}-location=${req.location} -project=${req.project} -name=${req.name}  -to=${req.to} -image=${req.image} -AddEnv=${Env}`
	}
	this.get = function (req = IDeploy.get(), deployApp) {
		return `${deployApp} deployment ${req.type} -location=${req.location} -project=${req.project} -name=${req.name}`
	}
	this.delete = function (req = IDeploy.delete(), deployApp) {
		return `${deployApp} deployment ${req.type} -location=${req.location} -project=${req.project} -name=${req.name}`
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
			to: undefined
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
			name: undefined,
		}
	}
}

await run()
