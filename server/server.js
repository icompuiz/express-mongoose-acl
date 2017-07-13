var express = require("express"),
    http = require("http"),
    path = require("path"),
    mongoose = require("mongoose"),
    acl = require("acl"),
    _ = require('lodash'), // lodash is really userful				
    ;



/*
 * ------------------------------------------------
 * Create App and configure
 */

var app = express(),
    port = process.env.PORT || 3000,
    dburi = "mongodb://localhost/ExpressMongooseACL";

/*
 * ------------------------------------------------
 * General middleware
 */

app.set("port", port);
app.set('views', path.join(__dirname, '../', 'views'));
app.set('view engine', 'jade');


app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(express.cookieParser('a very secret key'));
app.use(express.session());
app.use(app.router);
app.use(express.static(path.join(__dirname, "../", "public")));

/*
 * ------------------------------------------------
 * Configure by environment
 */
if ('development' == app.get('env')) {
    app.use(express.errorHandler());
}


/*
 * ------------------------------------------------
 * Database & Models
 */

mongoose.connect(dburi);

mongoose.connection.on('connected', function() {
    console.log('Mongoose connected to ' + dburi);
});

mongoose.connection.on('disconnected', function() {
    console.log('Mongoose disconnected');
});

process.on('SIGINT', function() {
    console.log('Mongoose disconnected through app termination');
    process.exit(0);
});

/*
 * Permission Definitions
 */

var publicPermissions = {

    role: 'guest',
    resources: [

        '/',
        '/404',
        '/login',
        '/register'
    ],
    permissions: ['get', "post"],
};

var adminPermissions = {

    role: 'admin',
    resources: [

        '/books',
        '/books/:param1',
        '/users',
        '/users/:param1',
        'randomresource'
    ],
    permissions: ['*'],
};

var userPermissions = {
    role: 'user',
    resources: [
        '/books',
    ],
    permissions: ['get', 'post'],
};

var permissions = [
    guestPermissions,
    adminPermissions,
    userPermissions
];


/*
 * ------------------------------------------------
 * Models
 */
 
 var bookSchema = new mongoose.Schema({
    name: {
        type: String,
        unique: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
	ref: 'User'
    }
});

bookSchema.post('save', function(book) {
   acl.allow(book.user._id, '/books/' + book._id, ['*'], function() {});
});

mongoose.model('Book', bookSchema);
var Book = mongoose.model('Book');

var userSchema = new mongoose.Schema({
    username: {
        type: String,
        unique: true
    },
    email: {
        type: String,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    roles: {
        type: [String],
        default: "guest"
    }
});

userSchema.post('save', function(doc) {
    var roles = doc.roles;

    if (!roles.length) {
        roles = ['user'];
    }

    acl.addUserRoles(doc._id.toString(), roles, function(err) {
        // if error handle error 
        // otherwise be happy or double check 
    });
});




mongoose.model('User', userSchema);
var User = mongoose.model('User');

var saveCallback = function(err, user) {
    if (!err) {
        console.log("_____________________________________");
        console.log("New User");
        console.log("username:   " + user.username);
        console.log("role:       " + user.roles[0]);
    }
};

var guestUser = new User({
    username: "public",
    email: "public@something.com",
    password: "publicpassword",
    roles: ["guest"]
});

var userUser = new User({
    username: "user",
    email: "user@something.com",
    password: "userpassword",
    roles: ["user"]
});

var adminUser = new User({
    username: "admin",
    email: "admin@something.com",
    password: "adminpassword",
    roles: ["admin"]
});


guestUser.save(saveCallback);
userUser.save(saveCallback);
adminUser.save(saveCallback);

// assign a user for the purposes of testing
var selectedUser = guestUser;

/*
 * Load the default permissions
 */

function addACO(subject, added) {
    var role = subject.role;
    var resource = subject.resource;
    var permissions = subject.permissions;

    acl.allow(role, resource, permissions, added);
}

function addACL(cb) {

    async.each(permissions, function(aco, next) {

        var role = aco.role;
        var resources = aco.resources;
        var permissions = aco.permissions;
        var children = aco.children || null;

        async.each(resources, function(resource, next) {

            var subject = {
                role: role,
                resource: resource.name || resource,
                permissions: resource.permissions || permissions
            }

            addACO(subject, next);


        }, next);

    }, function(err) {

        acl.addUserRoles("public", "public", cb);

    });

}

/*
 *
 * Controllers
 */

var BooksCtrl = {

    list: function(req, res) {res.send(200);},
    create: function(req, res) {res.send(200);},
    read: function(req, res) {res.send(200);},
    update: function(req, res) {res.send(200);},
    delete: function(req, res) {res.send(200);},

}

var UsersCtrl = {

    list: function(req, res) {res.send(200);},
    create: function(req, res) {res.send(200);},
    read: function(req, res) {res.send(200);},
    update: function(req, res) {res.send(200);},
    delete: function(req, res) {res.send(200);}

}



/*
 * ------------------------------------------------
 * Routes
 */

function toACLDefinition(subject) {
	var urlParts = subject.split('/');
	
	var index = 1;
	var corrected = _.map(urlParts, function(part) { // this is a underscore.js/lodash.js method. You may want to include this in your project.
	
	
	    if (part.match(/[0-9a-fA-F]{24}/)) { // if there is an unexpected parameterized route, create a default parameter to check
	        var param = ':param' + index;
	        index++;
	        return param;
	    } else if (part == ':id([0-9a-fA-F]{24}$)?') { // special case for node-restful routes - node resful routes must be defined as /api/model/:id
	        return ":id";
	    } else if (part.trim() == '') {} else {
	        return part;
	    }
	
	});
	
	return corrected.join("/");
};
    
var route = function(req, res, next) {
    var userId = req.session.user ? req.session.user._id : null;

    var userId = req.session.user._id || 'public';

    var route = req.path;

    console.log('Matches Route:', req.route.path);

    console.log('Original route:', route);

    route = toACLDefinition(route).replace(/\/$/, '') || '/';

    // check permissions
    return acl.isAllowed(id, route, req.method.toLowerCase(), function(err, allow) {

        if (err) {
            // Oh no! An error.
            return res.send(500, 'Unexpected authorization error');
        }

        if (allow) {
            // Woohoo, access granted. Invoke next() 
            return next();
        } 
        
        // Check again with the raw path
        return acl.isAllowed(id, req.path,req.method.toLowerCase(), function(err, allow) {
        	if (err) {
	            // Oh no! An error.
	            return res.send(500, 'Unexpected authorization error');
	        }
	
	        if (allow) {
	            // Woohoo, access granted. Invoke next() 
	            return next();
	        } 
	        
	        // not allowed, sorry
        	return res.send(403);
        });

        
    });
};

app.get("/", route);

app.get('/books', route, BooksCtrl.list);
app.get('/books/:id', route, BooksCtrl.read);
app.post('/books', route, BooksCtrl.create);
app.put('/books', route, BooksCtrl.update);
app.delete('/books', route, BooksCtrl.delete);

app.get('/users', route, UserCtrl.list);
app.get('/users/:id', route, UserCtrl.read);
app.post('/users', route, UserCtrl.create);
app.put('/users', route, UserCtrl.update);
app.delete('/users', route, UserCtrl.delete);



/*
 * ------------------------------------------------
 * ACL
 */

var nodeAcl = new acl(new acl.mongodbBackend(mongoose.connection.db));

app.use(nodeAcl.middleware);

//nodeAcl.allow('guest', ['books'], ['get', 'post']); // throws error
//nodeAcl.allow('admin', ['books', 'users'], '*'); // throws error


/*
 * ------------------------------------------------
 * Create Server
 */

http.createServer(app).listen(app.get("port"), function() {
    console.log("Express server listening on port " + app.get("port"));
    console.log("Node Environment: " + app.get("env"));
});

process.on("SIGINT", function() {
    console.warn("Express server listening on port " + app.get("port") + " exiting");
    process.exit(0);
});
