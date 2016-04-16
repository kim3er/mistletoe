import 'babel-polyfill';

import path from 'path';

import git from 'gh-pages/lib/git';
import slug from 'slug';

import fsh from './extensions/fs';
import log from './extensions/log';

const projectDirectories = [
	'.build',
	'posts',
	'static'
];

const projectDefaults = {
	'srcPath': './src',
	'buildPath': './.build',
	'postTemplate': 'post.html',
	'postUrl': '/blog/{{ year }}/{{ month }}/{{ day }}/{{ fileName }}/',
	'filters': {
		'date': { 'path': 'date', 'local': true },
		'letters': { 'path': 'letters', 'local': true }
	}
};

export default async function create(name, force) {
	const slugged = slug(name),
		projectRoot = path.join(process.cwd(), slugged);

	log('CREATE', `Creating '${name}'`);

	if (force) {
		await fsh.mkdirp(projectRoot);
	}
	else {
		try {
			await fsh.mkdir(projectRoot);
		}
		catch (exp) {
			if (exp.code === 'EEXIST') {
				log('CREATE', `Directory '${slugged}' already exists`);
			}
			else {
				log('CREATE', 'Unhandled exception while creating root directory');
				console.log(exp);
			}
			return false;
		}
	}

	for (const dir of projectDirectories) {
		await fsh.mkdirp(path.join(projectRoot, dir));
	}

	await fsh.writeFile(path.join(projectRoot, '.mistletoerc'), JSON.stringify(projectDefaults, null, 2));

	await git.init(projectRoot);

	log('CREATE', `Created '${name}'. `);
}
