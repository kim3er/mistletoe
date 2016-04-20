import 'babel-polyfill';

import path from 'path';

import sass from 'node-sass';

import fsh from './extensions/fs';

import Renderer from './components/renderer';

import grabPostData from './parsers/posts';

import renderArchive from './renderers/archive';
import renderPosts from './renderers/posts';
import renderCategories from './renderers/categories';
import renderAtom from './renderers/atom';

import getSettings from './settings';

export default async function build() {
	const projectRoot = await require('./components/project_root').default(process.cwd());

	const settings = await getSettings(),
		postsSrcPath = `${settings.srcPath}/posts`,
		renderer = new Renderer(settings, projectRoot);

	await fsh.rimraf(settings.buildPath);

	const { postsByYear, categories, postCount } = await grabPostData(postsSrcPath, settings, renderer);

	await renderPosts(renderer, settings, postsByYear.reduce((a, b) => { return a.concat(b.posts); }, []));

	await renderArchive(renderer, settings, postsByYear, postCount);
	await renderCategories(renderer, settings, categories);
	await renderAtom(renderer, settings, postsByYear);

	await (async function() {
		const processors = {
			'.scss': function(data) {
				return new Promise(function(resolve, reject) {
					sass.render({
						data: buffer,
						includePaths: data.dir
					}, function(err, result) {
						if (err) {
							reject(err);
						}
						else {
							resolve({
								buffer: result.css,
								ext: '.css'
							});
						}
					});
				});
			}
		};

		const processorExtnames = Object.keys(processors);

		await fsh.cpdir(
			`${settings.srcPath}/stylesheets`,
			`${settings.buildPath}/stylesheets`,
			function(data) {
				if (processorExtnames.includes(data.ext)) {
					data = Object.assign(data, processors[data.ext](data));
				}

				return data;
			}
		);
	})();

	async function copyImages(dir) {
		const ls = await fsh.readdir(dir);
		for (const entry of ls) {
			if (entry.startsWith('.')) {
				continue;
			}

			const entryPath = `${dir}/${entry}`;

			if ((await fsh.lstat(entryPath)).isDirectory()) {
				await copyImages(entryPath);
			}
			else {
				const pathFragment = dir.slice(settings.srcPath.length),
					srcPath = path.join(projectRoot, entryPath),
					destDir = path.join(projectRoot, settings.buildPath, pathFragment),
					destPath = path.join(destDir, entry);

				await fsh.mkdirp(destDir);
				await fsh.cp(srcPath, destPath);
			}
		}
	};

	await copyImages(`${settings.srcPath}/images`);

	async function copyStatics(dir) {
		const ls = await fsh.readdir(dir);
		for (const entry of ls) {
			const entryPath = `${dir}/${entry}`;

			if ((await fsh.lstat(entryPath)).isDirectory()) {
				await copyStatics(entryPath);
			}
			else {
				const pathFragment = dir.slice(`${projectRoot}/static`.length),
					destDir = path.join(projectRoot, settings.buildPath, pathFragment),
					destPath = path.join(destDir, entry);

				await fsh.mkdirp(destDir);
				await fsh.cp(entryPath, destPath);
			}
		}
	}

	await copyStatics(`${projectRoot}/static`);
};
