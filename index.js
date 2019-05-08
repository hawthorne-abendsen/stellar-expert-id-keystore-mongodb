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

    async connect() {
        await this.client.connect()
        this.db = this.client.db()
        await this.db.collection(userCollectionName).createIndex({
            'email': 1
        }, {
            unique: true
        })
    }

    async close() {
        if (this.client.isConnected())
            this.client.close()
        await Promise.resolve()
    }

    async getUserByEmail(email) {
        const user = await this.db.collection(userCollectionName).findOne({
            email: email
        })

        normalizeUser(user)

        return user
    }

    async registerUser(user) {
        await this.db.collection(userCollectionName).insertOne(user)

        if (!user._id)
            throw new Error('Unable to insert new user')

        normalizeUser(user)

        return user
    }

    async updateUser(user) {

        const oldUser = await this.getUserByEmail(user.email)
        if (!user)
            throw new Error('Unable to find user with specified email')

        let updateObject = {}
        for (let key in user) {
            if (user[key] !== oldUser[key] && key !== '_id')
                updateObject[key] = user[key]
        }

        if (Object.keys(updateObject).length < 1)
            return

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