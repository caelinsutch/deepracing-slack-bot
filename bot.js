'use strict';

const AWS   = require('aws-sdk');
const Slack = require('slack');

/**
 * Handles the http request, calls the bot lambda and responds the request with data
 * @async
 * @param  {Object} data
 * @return {Object}
 */
module.exports.run = async ( data ) =>
{
    const dataObject = JSON.parse( data.body );

    // The response we will return to Slack
    let response = {
        statusCode: 200,
        body      : {},
        // Tell slack we don't want retries, to avoid multiple triggers of this lambda
        headers   : { 'X-Slack-No-Retry': 1 }
    };

    try {
        console.log('Body of request');
        console.log(dataObject);
        // If the Slack retry header is present, ignore the call to avoid triggering the lambda multiple times
        if ( !( 'X-Slack-Retry-Num' in data.headers ) )
        {
            // What kind of event is this?
            switch ( dataObject.event.type )
            {
                case 'url_verification':
                    response.body = verifyCall( dataObject );
                    break;
                case 'app_mention':
                    console.log('Handling Mention');
                    await handleMention( dataObject.event );
                    response.body = { ok: true };
                    break;
                case 'team_join':
                    await newTeamMember(dataObject.user);
                    response.body = { ok: true};
                    break;
                default:
                    response.statusCode = 400;
                    response.body = 'Empty request';
                    break;
            }
        }
    }
    catch( err )
    {
        response.statusCode = 500,
            response.body = JSON.stringify( err )
    }
    finally
    {
        return response;
    }
}

/**
 * Verifies the URL with a challenge - https://api.slack.com/events/url_verification
 * @param  {Object} data The event data
 */
function verifyCall( data )
{
    if ( data.token === process.env.VERIFICATION_TOKEN )
    {
        return data.challenge;
    }
    else {
        throw 'Verification failed';
    }
}

/**
 * Process the message and executes an action based on the message received
 * @async
 * @param {Object} message The Slack message object
 */
async function handleMention( message )
{
    console.log(message);
    // If bot was mentioned
    if ( !message.bot_id )
    {
        // Gets the command from the message
        let command = parseMessage( message.text );

        // Executes different commands based in the specified instruction
        switch ( command )
        {
            case 'help':
                await sendSlackMessage( message.channel,
                    '');
                break;
            case 'test':
                await sendSlackMessage( message.channel,
                    `Very cool, thank you for testing me. Now sending you some fun info!` );
                await sendSlackMessage( message.user, 'You have been tested!');
                break;
            case 'hello':
                await sendSlackMessage(message.channel,
                    'Hello there!');
            default:
                await sendSlackMessage( message.channel,
                    `Thank you for calling me, now run \`@${process.env.BOT_NAME} test\` to test me and report the results` );
                break;
        }
    }
}

async function newTeamMember(user) {
    console.log('New Team Member Called');
    console.log(user);
    // Send a message to the user:
    sendSlackMessage(user.id, `Welcome to the DeepRacing Community Slack! This bot is still in development, if this worked for you, give @caelinsutch a heads up so he knows everything is working properly!`)
}

/**
 * Sends a message to Slack
 * @param  {String} channel
 * @param  {String} message
 * @return {Promise}
 */
function sendSlackMessage( channel, message )
{
    console.log('Sending message ' + message + ' to ' + channel);
    const params = {
        token  : process.env.BOT_TOKEN , // This is the Bot User OAuth Access Token under Oauth and permissions in slack
        channel: channel,
        text   : message

    };

    return Slack.chat.postMessage( params );
}

/**
 * Parses the command/intent from the text of a message received by the bot
 * @param  {String} message
 * @return {String}
 */
function parseMessage( message )
{
    return message.split( ' ', 2 ).pop();
}
