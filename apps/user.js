const async = require('async');

const messages = require('../messages.json')

module.exports = function(config, express, models) {
	express.use(function(req, res, next) {
		(function(callback) {
			if (!req.session.userId) {
				callback(null);
				return;
			}

			models.getUser(req.session.userId, function(error, user) {
				if (!user) {
					callback(null);
					return;
				}

				delete user.password;

				callback(user);
			});
		})(function(user) {
			req.user = user;
			next();
		});

		res.shouldSignin = function() {
			if (req.user === null) {
				res.jsonAuto({ error: new Error(messages.login_required) });
				return true;
			} else {
				return false;
			}
		};
	});

	express.post('/user/signin', function(req, res) {
		const {username, password} = req.body;

		models.authUser(username, password, function(error, userId) {
			if (!error && userId === null) {
				error = new Error(messages.login_failed);
			}

			if (error) {
				res.jsonAuto({ error: error });
			} else {
				req.session.userId = userId;
				res.jsonAuto({ error: null });
			}
		});
	});

	express.get('/user/signout', function(req, res) {
		if (res.shouldSignin()) { return; }

		req.session.destroy(function(error) {
			res.jsonAuto({ error: error })
		});
	});

	express.post('/user/signup', function(req, res) {
		const {username, password, passwordRe} = req.body;

		async.waterfall([
			function(callback) {
				if (!password) {
					callback(new Error(messages.password_required));
					return;
				}
				
				if (password !== passwordRe) {
					callback(new Error(messages.password_mismatch));
					return;
				}
				
				callback(null);
			},
			function(callback) {
				models.addUser({
					username: username,
					password: password
				}, callback);
			}
		], function(error) {
			res.jsonAuto({ error: error });
		});
	});

	express.post('/user/update', function(req, res) {
		if (res.shouldSignin()) { return; }

		const {username, password, passwordRe} = req.body;

		async.waterfall([
			function(callback) {
				if (password !== passwordRe) {
					callback(new Error(messages.password_mismatch));
					return;
				}

				callback(null);
			},
			function(callback) {
				const user = {};

				if (username) {
					user.username = username;
				}

				if (password) {
					user.password = password;
				}

				models.updateUser(req.user._id, user, callback);
			}
		], function(error) {
			res.jsonAuto({ error: error });
		});
	});

	express.get('/user/remove', function(req, res) {
		if (res.shouldSignin()) { return; }

		models.removeUser(req.user._id, function(error) {
			res.jsonAuto({ error: error });
		});
	});
};