import fs from 'fs';
import path from 'path';

import mkdirp from 'mkdirp';
import rimraf from 'rimraf';

export default class FsHelpers {

	// http://stackoverflow.com/a/14387791/110010
	static cp(source, target) {
		return new Promise(function(resolve, reject) {
			const rd = fs.createReadStream(source);
			rd.on('error', function(err) {
			  reject(err);
			});

			const wr = fs.createWriteStream(target);
			wr.on('error', function(err) {
			  reject(err);
			});
			wr.on('close', function(ex) {
			  resolve();
			});

			rd.pipe(wr);
		});
	}

	static async rundir(dir, func, dotFiles = false, partials = false) {
		const entries = await FsHelpers.readdir(dir);
		for (const entry of entries) {
			if (!dotFiles && entry.startsWith('.')) {
				continue;
			}

			const entryPath = path.join(dir, entry);
			if ((await FsHelpers.lstat(entryPath)).isDirectory()) {
				await FsHelpers.rundir(entryPath, func, dotFiles, partials);
			}
			else {
				if (!partials && entry.startsWith('_')) {
					continue;
				}

				await func(dir, entry);
			}
		}
	}

	static async cpdir(dir, targetDir, func, dotFiles = false, partials = false) {
		await FsHelpers.rundir(dir, async function(entryDir, entry) {
			const entryPath = path.join(entryDir, entry);

			const pathFragment = entryDir.slice(dir.length),
				destDir = path.join(targetDir, pathFragment);

			await FsHelpers.mkdirp(destDir);

			if (func) {
				const file = path.parse(entryPath);
				file.buffer = await FsHelpers.readFile(entryPath);

				const data = await func(file);

				if (!data.buffer) {
					data.buffer = file.buffer;
				}

				if (!data.name) {
					data.name = file.name;
				}

				if (!data.ext) {
					data.ext = file.ext;
				}

				await FsHelpers.writeFile(
					path.join(destDir, `${data.name}${data.ext}`), data.buffer);
			}
			else {
				await FsHelpers.cp(entryPath, path.join(destDir, entry));
			}
		}, dotFiles, partials);
	}

	static lstat(path) {
		return new Promise(function(resolve, reject) {
			fs.lstat(path, function(err, stats) {
				if (err) {
					reject(err);
				}
				else {
					resolve(stats);
				}
			});
		});
	}

	static mkdir(path, mode) {
		return new Promise(function(resolve, reject) {
			fs.mkdir(path, mode, function(err) {
				if (err) {
					reject(err);
				}
				else {
					resolve();
				}
			});
		});
	}

	static mkdirp(path) {
		return new Promise(function(resolve, reject) {
			mkdirp(path, function(err) {
				if (err) {
					reject(err);
				}
				else {
					resolve();
				}
			});
		});
	}

	static readdir(path) {
		return new Promise(function(resolve, reject) {
			fs.readdir(path, function(err, data) {
				if (err) {
					reject(err);
				}
				else {
					resolve(data);
				}
			});
		});
	}

	static readFile(file) {
		return new Promise(function(resolve, reject) {
			fs.readFile(file, function(err, data) {
				if (err) {
					reject(err);
				}
				else {
					resolve(data);
				}
			});
		});
	}

	static rimraf(path) {
		return new Promise(function(resolve) {
			rimraf(path, resolve);
		});
	}

	static writeFile(file, data) {
		return new Promise(function(resolve, reject) {
			fs.writeFile(file, data, function(err) {
				if (err) {
					reject(err);
				}
				else {
					resolve();
				}
			});
		});
	}

}
