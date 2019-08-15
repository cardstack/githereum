const fsBlobStore                               = require('fs-blob-store');
const { shellCommand }                          = require('../utils/async');
const { writeSync, createReadStream }           = require('fs');
const concat                                    = require('concat-stream');
const aws                                       = require('aws-sdk');
const s3blobs                                   = require('s3-blob-store');
const tmp                                       = require('tmp');
const promisepipe                               = require("promisepipe");

function validateBlobStoreConfig(config) {
  if(!config.type) {
    throw new Error("Blob storage config requires a key named 'type'");
  }

  if (config.type === 'file' && !config.path) {
    throw new Error("File blob storage requires a key named 'path'");
  }

  if (config.type === 's3' && !config.path) {
    throw new Error("File blob storage requires a key named 'path'");
  }
}

async function blobStore(config) {
  if (config.type === 'file') {
    await shellCommand(`mkdir -p ${config.path}`);
    return fsBlobStore(`${config.path}`);
  } else if (config.type === 's3') {
    let s3Client = new aws.S3({
      accessKeyId:      config.aws_access_key_id,
      secretAccessKey:  config.aws_secret_access_key
    });

    return s3blobs({
      client: s3Client,
      bucket: config.bucket
    });
  }
}

async function writeToBlobStream(key, blob, config) {
  if (config.type === 'stub') {
    return;
  }

  let store = await blobStore(config);
  let writeStream = store.createWriteStream({ key });
  let tmpfile = tmp.fileSync();
  writeSync(tmpfile.fd, blob);
  let readStream = createReadStream(tmpfile.name);
  await promisepipe(readStream, writeStream);
}

async function readFromBlobStream(key, config) {
  if (config.type === 'stub') {
    return Buffer.from([]);
  }

  let store = await blobStore(config);
  let readStream = store.createReadStream({ key });
  let buffer = await new Promise((resolve, reject) => {
    let concatStream = concat(resolve);
    readStream.pipe(concatStream);
    readStream.on('error', reject);
  });
  return buffer;
}


module.exports = {
  writeToBlobStream, readFromBlobStream, validateBlobStoreConfig
};

