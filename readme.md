# ti.dbutil
This simple library allows you to automatically do transactional database queries without any extra effort.

## What is does under the hood
Whenever a query is NOT a `SELECT` query it will automatically generate a transaction. Then, after `50ms` it will commit the queries. If you submit another query within 50ms it will add this query also to this transaction and reset the timeout to `50ms`.

## Why transactions?
Transactions in SQLite are significantly lighter on performance. Especially when doing many queries. A simple performance test of inserting 1000 items into a database helps illustrate this performance. 

- Run example script (below) without transactions: 757ms*
- Run example script (below) with transactions: 35ms*

**This test was performed in an iOS 13 Simulator. Device performance is most likely worse than this*

## How do transactions work?
In SQLite to enable transactional queries, you need to execute 2 additional queries.

First, before the first query (except `SELECT`), execute this:

```js
database.execute("BEGIN TRANSACTION;");
```

After that, execute all your (non SELECT) queries as you normally do. When you've done that, execute the commit query:

```js
database.execute("COMMIT;");
```

## How does this library help?
`ti.dbutil` helps you by automatically chunking together all your queries, while `SELECT` queries are ignored and just work as normally, even if those `SELECT` queries are in the middle of insert/update/delete queries. 

Furthermore, you don't need to manually `BEGIN` any transaction, nor do you need to `COMMIT` them. This all happens automagically under the hood. Even if you run queries from all throughout your app. 

There is only one thing you need to take into consideration, whenever you depend on the previous query being executed, you will need to manually run `commit`. This is illustrated in the example below

## Example
So how do you use this library? Quite easy! Below you'll see a script that drops a table if it exists, then creates a table plus index, and then inserts 1000 items. 

As you can see, nothing special required, and the 1000 queries for insert will all be bundled in the same transaction. As will creating the table and creating the index.

```js
const dbutil = new (require('ti.dbutil'))({
	dbname: 'my_data.db'
});

dbutil.execute("DROP TABLE IF EXISTS test;");
dbutil.commit();

dbutil.execute("CREATE TABLE test(id integer PRIMARY KEY, name TEXT);");
dbutil.execute("CREATE INDEX test_name ON test(name);");
dbutil.commit();

for (var index = 1; index <= 1000; index++) {
	dbutil.execute("INSERT INTO test(name) VALUES ('Row " + index + "');");
}
dbutil.close();
```

## Configuration

When requiring `ti.dbutil` and creating a new database, you need to provide the name (or path) of the database as you normally do with `Ti.Database.open(name)`. However, a few more configurations are possible, all listed in below example. All fields besides `dbname` are optional.

```js
const dbutil = new (require('ti.dbutil'))({
    dbname: 'my_data.db', // name of database
    autocommitTimeout: 50, // timeout (in ms) after last query when it should be executed. 50 is default
    encryptedDB: false, // if you want to use the encryptedDatabase module (pro+ subscription required)
    password: 'pass', // password for the encrypted database
    noTransactions: false // set to true to disable transactional queries
});
```

**`password` is required when `encryptedDB` property is `true`*

## Public methods
These methods are exposed after you've opened a database as shown above.

- `.execute(query)` - execute a query. Will auto-transaction when not `SELECT`
- `.close()` - close the database connection. Will auto-commit if any queries are open
- `.remove()` - remove the database file
- `.commit()` - will commit any pending queries. Useful if you don't want to wait the `timeout`
- `.rollback()` if you want to dismiss any open queries.
- `.open()` - if you want to reopen the database after you've closed/removed it.