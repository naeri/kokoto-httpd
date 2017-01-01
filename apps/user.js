const async = require('async');

const messages = require('../messages.json')

module.exports = function(config, express, models) {
	express.use(function(req, res, next) {
		res.shouldSignin = function() {
			if (req.user === null) {
				res.jsonAuto({ error: new Error(messages.login_required) });
				return true;
			} else {
				return false;
			}
		};

		(function(callback) {
			if (!req.session.userId) {
				callback(null);
				return;
			}

			models.getUser(req.session.userId, true, function(error, user) {
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
	});

	express.get('/user/status', function(req, res) {
		if (!res.shouldSignin()) {
			res.jsonAuto({ user: req.user });
		}
	});

	express.post('/user/signin', function(req, res) {
		const {username, password} = req.body;

		models.authUser(username, password, function(error, user) {
			if (user) {
				req.session.userId = user._id;
			}

			res.jsonAuto({
				error: error,
				user: user
			});
		});
	});

	express.get('/user/signout', function(req, res) {
		if (res.shouldSignin()) { return; }

		req.session.destroy(function(error) {
			res.jsonAuto({ error: error })
		});
	});

	express.post('/user/signup', function(req, res) {
		const {username, password} = req.body;

		async.waterfall([
			function(callback) {
				if (!password) {
					callback(new Error(messages.password_required));
				} else {
					callback(null);
				}
			},
			function(callback) {
				models.addUser({
					username: username,
					password: password
				}, callback);
			}
		], function(error, user) {
			res.jsonAuto({
				error: error,
				user: user
			});
		});
	});

	express.post('/user/update', function(req, res) {
		if (res.shouldSignin()) { return; }

		const user = {};
		const {username, password} = req.body;

		if (username) {
			user.username = username;
		}

		if (password) {
			user.password = password;
		}

		models.updateUser(req.user._id, user, function(error) {
			res.jsonAuto({ error: error });
		});
	});

	express.get('/user/remove', function(req, res) {
		if (res.shouldSignin()) { return; }

		async.parallel([
			(callback) => {
				models.removeUser(req.user._id, callback);
			},
			(callback) => {
				req.session.destroy(callback);
			}
		], function(error) {
			res.jsonAuto({ error: error });
		});
	});
};