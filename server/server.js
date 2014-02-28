

var express             = require("express"),
    http                = require("http"),
    path                = require("path"),
    mongoose            = require("mongoose"),
    acl                 = require("acl")
    ;



/*
 * ------------------------------------------------
 * Create App and configure
 */

var app     = express(),
    port    = process.env.PORT || 3000,
    dburi   = "mongodb://localhost/ExpressMongooseACL"
    ;

/*
 * ------------------------------------------------
 * General middleware
 */

app.set("port", port );
app.set('views', path.join(__dirname, '../', 'views'));
app.set('view engine', 'jade');


app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(express.cookieParser('a very secret key'));
app.use(express.session());
app.use(app.router);
app.use(express.static(path.join(__dirname, "../", "public" )));

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

mongoose.connection.on('disconnected', function(){
    console.log('Mongoose disconnected');
});

process.on('SIGINT', function() {
    console.log('Mongoose disconnected through app termination');
    process.exit(0);
});


/*
 * ------------------------------------------------
 * Models
 */

var userSchema = new mongoose.Schema({
    username:   { type: String, unique: true },
    email:      { type: String, unique: true },
    password:   { type: String, required: true },
    roles:      { type: [String], default: "guest" }
});

mongoose.model( 'User', userSchema );
var User = mongoose.model('User');

var saveCallback = function(err, user) {
    if ( !err ) {
        console.log("_____________________________________");
        console.log("New User");
        console.log("username:   " + user.username);
        console.log("role:       " + user.roles[0]);
    }
};

var guestUser = new User({
    username:   "public",
    email:      "public@something.com",
    password:   "publicpassword",
    roles:      ["guest"]
});

var userUser = new User({
    username:   "user",
    email:      "user@something.com",
    password:   "userpassword",
    roles:      ["user"]
});

var adminUser = new User({
    username:   "admin",
    email:      "admin@something.com",
    password:   "adminpassword",
    roles:      ["admin"]
});


guestUser.save(saveCallback);
userUser.save(saveCallback);
adminUser.save(saveCallback);

// assign a user for the purposes of testing
var selectedUser = guestUser;

/*
 * ------------------------------------------------
 * Routes
 */
var route = function(req, res) {
    var userId = req.session.user ? req.session.user._id : null;
    var username = req.session.user ? req.session.user.username : "";
    var roles = req.session.user ? req.session.user.roles : "";

    req.session.userId = userId; // do i need this?
    req.session.user = selectedUser;
    res.json({
        route: req.route.path,
        verb: req.method,
        user: username,
        roles: roles
    });
};

app.get("/", route);

app.get('/books', route);
app.get('/books/:id', route);
app.post('/books', route);
app.put('/books', route);
app.delete('/books', route);

app.get('/users', route);
app.get('/users/:id', route);
app.post('/users', route);
app.put('/users', route);
app.delete('/users', route);



/*
 * ------------------------------------------------
 * ACL
 */

var nodeAcl = new acl(new acl.mongodbBackend(mongoose.connection.db));

app.use( nodeAcl.middleware );

//nodeAcl.allow('guest', ['books'], ['get', 'post']); // throws error
//nodeAcl.allow('admin', ['books', 'users'], '*'); // throws error


/*
 * ------------------------------------------------
 * Create Server
 */

http.createServer(app).listen(app.get("port"), function(){
	console.log( "Express server listening on port " + app.get("port") );
	console.log( "Node Environment: " + app.get("env") );
});

process.on("SIGINT", function() {
	console.warn( "Express server listening on port " + app.get("port") + " exiting");
	process.exit(0);
});



