// This simple library automatically puts any (non select) query inside
// a transaction, significantly increasing performance without
// the need of adding transactions throughout your app


/**
 * @param {Object} options Options object, see documentation for details
 */
function db(options) {

    let transactionStarted = false;
    let timer = false;
    let queries = 0;
    let database; 
    
    if (!options.autocommitTimeout) {
        options.autocommitTimeout = 50;
    }

    /**
     * Execute a query on the database
     */
    this.execute = (query) => {
        if (!database) {
            Ti.API.error('ti.dbutil: CANNOT EXECUTE; NO DATABASE LOADED; ' + query);
            return;
        };
        if (query.toLowerCase().indexOf('select') === 0) {
            return database.execute(query);
        }
        clearTimeout(timer);
        if (transactionStarted === false && !options.noTransactions) {
            database.execute("BEGIN TRANSACTION;");
            transactionStarted = true;
        }
        database.execute(query);
        timer = setTimeout(this.commit, options.autocommitTimeout);
        queries++;
    }

    /**
     * Commit any pending queries for the transaction
     */
    this.commit = () => {
        if (!database || queries === 0 || transactionStarted === false || options.noTransactions) return;
        Ti.API.info(`ti.dbutil: committing transaction with ${queries} queries`);
        database.execute("COMMIT;");
        resetVars();
    }
    
    /**
     * Roll back any pending queries for the transaction
     */
    this.rollback = () => {
        if (!database || queries === 0 || transactionStarted === false || options.noTransactions) return;
        database.execute("ROLLBACK;");
        resetVars();
    }

    /**
     * Exposes the close method on the database
     */
    this.close = () => {
        // when closing database, any pending queries will first be committed
        this.commit();
        database.close();
        database = false;
        resetVars();
    }

    /**
     * Exposes the remove method of the database
     */
    this.remove = () => {
        database.remove();
        Ti.API.info(`ti.dbutil: Database ${options.dbname} has been removed.`);
        resetVars();
    }

    this.open = () => {
        // this flow checks if you want to use encrypted or regular database
        // encrypted database is a pro+ paid module
        // https://docs.appcelerator.com/platform/latest/#!/api/Modules.EncryptedDatabase
        if (options.dbname) {
            if (options.encryptedDB === true) {
                if (!options.password) {
                    Ti.API.error('ti.dbutil: Password not provided for encrypted database');
                }
                let encrypteddatabase = require("appcelerator.encrypteddatabase").open(options.dbname);
                encrypteddatabase.setPassword(options.password);
                database = encrypteddatabase.open(options.dbname);
            } else {
                database = Ti.Database.open(options.dbname);
            }
        } else {
            Ti.API.error('ti.dbutil: No dbname provided');
        }       
    }

    // private function to reset internal variables when pending queries
    // have either been committed or rolled back
    function resetVars() {
        transactionStarted = false;
        queries = 0;
        clearTimeout(timer);
        timer = false;
    }
    
    // open database based on configuration
    this.open();
}

module.exports = db;