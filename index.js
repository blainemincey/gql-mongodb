const {ApolloServer, gql} = require('apollo-server');
const MongoClient = require('mongodb').MongoClient;
const {GraphQLScalarType} = require ('graphql');

// Add your MongoDB Connection string below
const url = 'mongodb://localhost:27017';
const client = new MongoClient(
    url, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    }
);

// Connect to the MongoDB Database
// Using the sample_mflix.movies dataset
let db;
client.connect(function (err) {
    console.log('MongoDB connected.');
    db = client.db('sample_mflix');
});

// Our typeDefs or Schemas
const typeDefs = gql`
    
    # Movie Schema from sample_mflix.movies
    type Movie {
        _id: String
        plot: String
        genres: [String]
        runtime: Int
        cast: [String]
        num_mflix_comments: Int
        title: String
        fullplot: String
        countries: [String]
        directors: [String]
        rated: String
        year: Int
        imdb: IMDB
    }

    # Example of defining an object that is embedded in Schema above
    type IMDB {
        rating: FloatNaN
        votes: Int
        id: Int
    }
    
    # Example of defining a custom scalar
    # This was required due to several imdb.rating values being NaN
    scalar FloatNaN
    
    # The queries we can run
    type Query {
        movies: [Movie]
        movie(title: String): Movie
        smoketest: String
    }
`;

// Custom function used as part of our resolver to account for NaN values
function floatNaNValue(value) {
    if(isNaN(value)) {
        return 0.0
    } else {
        return value;
    }
}

// Resolver definitions
const resolvers = {

    // Our customer scalar FloatNan
    FloatNaN: new GraphQLScalarType({
        name: 'FloatNaN',
        description: 'Add support of NaN to native Float type',
        serialize: floatNaNValue,
        parseValue: floatNaNValue
    }),

    // The queries we can run
    // These are using the native MongoDB node driver
    Query: {

        // Simple smoke test to see if server is operational
        smoketest: () => {
            let myDate = new Date();
            console.log('Query - smoketest')
            return `Successful smoke test at ${myDate}!`;
        },

        // Grab all movies.  Not filtered so limit to 50 since dataset > 25k documents
        movies: async () => {
            console.log("Query - movies");
            return await db.collection('movies').find().limit(50).toArray()
                .then(results => {
                    console.log('Num movie results retrieved: ' + results.length);
                    return results;
                });
        },

        // Filter for a single movie with the given title.  Must be exact match.
        movie(parent, args, context, info) {
            console.log(`Query - movie with filter - title --> ${args.title}`);
            let filter = {
                title: args.title
            };

            return db.collection('movies').findOne(filter)
                .then(result => {
                    console.log('Filtered result found.');
                    return result;
                });
        }
    },
};

// The ApolloServer constructor requires two parameters: your schema
// definition and your set of resolvers.
const server = new ApolloServer({
    typeDefs,
    resolvers
});

// The `listen` method launches a web server.
server.listen().then(({url}) => {
    console.log(`🚀  Server ready at ${url}`);
});