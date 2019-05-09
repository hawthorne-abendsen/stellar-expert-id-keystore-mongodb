const MongoClient = require('mongodb').MongoClient

const userCollectionName = 'users'

function normalizeUser(user) {
    if (user)
        user.id = user._id.toString()
}

class MongoStorage {

    /**
     * @param {Object} options 
     * @param {String} options.connectionString
     */
    constructor(options) {
        if (!options)
            throw new Error('Options cannot be null or undefined')

        if (!options.connectionString)
            throw new Error('Connection string is null or undefined')

        this.connectionString = options.connectionString

        this.client = new MongoClient(this.connectionString)

    }

    /* 
     * Initialize storage, db connection.
     **/
    async connect() {
        await this.client.connect()
        this.db = this.client.db()
        await this.db.collection(userCollectionName).createIndex({
            'email': 1
        }, {
            unique: true
        })
    }

    /* 
     * Close connection.
     **/
    async close() {
        if (this.client.isConnected())
            this.client.close()
        await Promise.resolve()
    }

    /*
     * Fetch user by email.
     * @param {String} email - User email
     * @return {Object} User object if found or null
     **/
    async getUserByEmail(email) {
        const user = await this.db.collection(userCollectionName).findOne({
            email: email
        })

        normalizeUser(user)

        return user
    }

    /*
     * Create new user account.
     * @param {Object} user - Account object
     * @param {String} user.email - Email associated with a user
     * @param {String} user.passwordHash - User's password hash
     * @param {String} user.totpKey - 2FA TOTP seed
     * @param {Number} user.createDate - Create timestamp.
     * @param {Number} user.updateDate - Update timestamp.
     * @param {Number} user.v - Data version.
     * @return {Object} Persistent account object
     **/
    async registerUser(user) {
        await this.db.collection(userCollectionName).insertOne(user)

        if (!user._id)
            throw new Error('Unable to insert new user')

        normalizeUser(user)

        return user
    }

    /*
     * Update existing account.
     * @param {String} email - User email
     * @param {Object} update - Account update object
     * @param {String} update.data - encrypted sensitive account data
     * @param {String} update.passwordHash - User's password hash
     * @param {String} update.totpKey - 2FA TOTP seed
     * @param {Number} update.updateDate - Update timestamp.
     * @param {Number} update.v - Data version.
     * @return {Object} Saved user object
     **/
    async updateUser(email, update) {

        const user = await this.getUserByEmail(email)
        if (!user)
            throw new Error('Unable to find a user with the specified email')

        let updateObject = {}
        for (let key of ['data', 'passwordHash', 'totpKey', 'updateDate', 'v']) {
            const updateValue = update[key]
            if (update.hasOwnProperty(key) && user[key] !== updateValue)
                updateObject[key] = updateValue
        }

        if (Object.keys(updateObject).length < 1)
            return user

        const result = await this.db.collection(userCollectionName)
            .updateOne({
                _id: user._id
            }, {
                $set: updateObject
            })


        if (result.modifiedCount < 1)
            throw new Error('Unable to update user')

        normalizeUser(user)

        return user
    }

    async deleteByEmail(email) {
        const result = await this.db.collection(userCollectionName).deleteOne({
            email: email
        })

        if (result.deletedCount === 0)
            throw new Error('Error on user deletion')

        return await Promise.resolve()
    }
}

module.exports = MongoStorage