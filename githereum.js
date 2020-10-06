const defaultLogger   = require('debug')('gitchain');
const fs              = require('fs');
const Git             = require('isomorphic-git');
Git.plugins.set('fs', fs);
const { resolve }                               = require('path');
const { createKeyPair }                         = require('crypto2');
const crypto2                                   = require('crypto2');
const { writeFileSync, existsSync, mkdirSync }  = fs;
const { join }                                  = require('path');

const { randomKey, encrypt, decrypt }                                     = require("./utils/crypto");
const { writeToBlobStream, readFromBlobStream, validateBlobStoreConfig }  = require('./utils/blob-storage');

class Githereum {
  constructor(repoPath, repoName, contract, from, { log, privateKeyDir }={}) {
    if (!repoPath) {
      throw new Error("repoPath is a required argument");
    }
    if (!contract) {
      throw new Error("contract is a required argument");
    }

    if (!repoName) {
      throw new Error("repoName is a required argument");
    }

    this.repoName = repoName;
    this.repoPath   = repoPath;
    this.gitDir     = join(this.repoPath, '.git');
    if(existsSync(repoPath) && !existsSync(this.gitDir)) {
      // treat it as a bare repo because it exists buts it doesn't have a .git dir in it
      this.gitDir = this.repoPath;
    }

    this.contract = contract;
    this.from = from;

    this.log        = log || defaultLogger;

    this.privateKeyDir = privateKeyDir;
  }

  static async register(repo, contract, from, { log, blobStorageConfig, keyPath } = {}) {

    this.blobStorageConfig = blobStorageConfig || {
      type: 'file',
      path: 'tmp/blobs'
    };

    validateBlobStoreConfig(this.blobStorageConfig);

    log = log || defaultLogger;

    if (repo.includes(':')) {
      throw new Error("Repo names cannot contain the : character");
    }

    log(`Registering repo ${repo}`);

    let jsonStorage = JSON.stringify(this.blobStorageConfig);

    if (keyPath) {
      let { publicKeyPath } = Githereum.keyPaths(keyPath);
      let publicKey = await crypto2.readPublicKey(publicKeyPath);

      let symmetricKey = randomKey();


      let encryptedKey = await crypto2.encrypt.rsa(symmetricKey, publicKey);


      await contract.registerPrivate(repo, jsonStorage, encryptedKey, publicKey, { from });
    } else {
      await contract.register(repo, jsonStorage, { from });
    }


    log(`Registration successful`);
  }

  static async addOwner(repo, owner, contract, from, { privateKeyDir, publicKeyDir, log } = {}) {
    log = log || defaultLogger;

    log(`Adding owner ${owner} to repo ${repo}`);

    if (await contract.isPrivate(repo)) {
      if(!privateKeyDir || !publicKeyDir) {
        throw new Error("Public and private key is required to add owner to private repo");
      }

      let { encryptedKey, publicKey } = await Githereum.reencryptedSymmetricKey(
        privateKeyDir,
        publicKeyDir,
        repo,
        from,
        contract
      );

      await contract.addOwnerToPrivateRepo(repo, owner, encryptedKey, publicKey, { from });
    } else {
      await contract.addOwner(repo, owner, { from });
    }


    log(`Adding owner successful`);
  }

  static async removeOwner(repo, owner, contract, from, { log } = {}) {
    log = log || defaultLogger;

    log(`Removing owner ${owner} from repo ${repo}`);

    await contract.removeOwner(repo, owner, { from });

    log(`Removing owner successful`);
  }

  static async addWriter(repo, writer, contract, from, { privateKeyDir, publicKeyDir, log } = {}) {
    log = log || defaultLogger;

    log(`Adding writer ${writer} to repo ${repo}`);


    if (await contract.isPrivate(repo)) {
      if(!privateKeyDir || !publicKeyDir) {
        throw new Error("Public and private key is required to add writer to private repo");
      }

      let { encryptedKey, publicKey } = await Githereum.reencryptedSymmetricKey(
        privateKeyDir,
        publicKeyDir,
        repo,
        from,
        contract
      );

      await contract.addWriterToPrivateRepo(repo, writer, encryptedKey, publicKey, { from });
    } else {
      await contract.addWriter(repo, writer, { from });
    }

    log(`Adding writer successful`);
  }

  static async removeWriter(repo, writer, contract, from, { log } = {}) {
    log = log || defaultLogger;

    log(`Removing writer ${writer} from repo ${repo}`);

    await contract.removeWriter(repo, writer, { from });

    log(`Removing writer successful`);
  }

  static async addReader(repo, reader, ownerKeyDir, readerKeyDir, contract, from, { log } = {}) {
    log = log || defaultLogger;

    log(`Adding reader ${reader} to repo ${repo}`);

    if(!ownerKeyDir || !readerKeyDir) {
      throw new Error("Public and private key is required to add reader to private repo");
    }

    let { encryptedKey, publicKey } = await Githereum.reencryptedSymmetricKey(
      ownerKeyDir,
      readerKeyDir,
      repo,
      from,
      contract
    );

    await contract.addReader(repo, reader, encryptedKey, publicKey, { from });

    log(`Adding reader successful`);
  }

  static async getDecryptedKey(keyPath, repo, from, contract) {
    let { privateKeyPath } = Githereum.keyPaths(keyPath);

    let previouslyEncryptedSymmetricKey = await contract.encryptedKey(repo, from);
    let privateKey = await crypto2.readPrivateKey(privateKeyPath);
    return await crypto2.decrypt.rsa(previouslyEncryptedSymmetricKey, privateKey);
  }

  static async reencryptedSymmetricKey(ownerKeyDir, newKeyDir, repo, from, contract) {
    let { publicKeyPath } = Githereum.keyPaths(newKeyDir);
    let publicKey = await crypto2.readPublicKey(publicKeyPath);

    let decryptedSymmetricKey = await Githereum.getDecryptedKey(ownerKeyDir, repo, from, contract);

    let encryptedKey = await crypto2.encrypt.rsa(decryptedSymmetricKey, publicKey);

    return {
      encryptedKey,
      publicKey
    };

  }

  static async removeReader(repo, reader, contract, from, { log } = {}) {
    log = log || defaultLogger;

    log(`Removing reader ${reader} from repo ${repo}`);

    await contract.removeReader(repo, reader, { from });

    log(`Removing reader successful`);
  }

  static async head(repoName, tag, contract, { log } = {}) {
    log = log || defaultLogger;

    log(`Checking status of tag ${tag}`);

    let headSha = await contract.head(repoName, tag);

    log(`Sha of ${tag} is ${headSha}`);

    return headSha;
  }

  static async keygen(keyDir) {

    mkdirSync(keyDir, { recursive: true });

    let { publicKey, privateKey } = await createKeyPair();

    let { publicKeyPath, privateKeyPath } = Githereum.keyPaths(keyDir);

    writeFileSync(publicKeyPath, publicKey);
    writeFileSync(privateKeyPath, privateKey);
  }

  static keyPaths(keyDir) {
    let publicKeyPath = resolve(keyDir, 'rsa.pub');
    let privateKeyPath = resolve(keyDir, 'rsa.pem');
    return { publicKeyPath, privateKeyPath };
  }

  async ensureRegistered()  {
    let repo = await this.contract.repos(this.repoName);

    if (!repo.registered) {
      throw new Error(`${this.repoName} is not registered`);
    }
    return repo;
  }

  async loadBlobStoreConfig() {
    if (this.blobStorageConfig) { return; }


    let repo = await this.ensureRegistered();

    this.blobStorageConfig = JSON.parse(repo.blobStoreMeta);

    validateBlobStoreConfig(this.blobStorageConfig);
  }

  async storeTree(treeId) {
    await this.writeToPackfile(treeId);

    let treeInfo = await this.gitCommand('readObject', {oid: treeId, format: 'parsed'});

    for (let entry of treeInfo.object.entries) {
      if (entry.type === 'tree') {
        await this.storeTree(entry.oid);
      } else if (entry.type === 'blob') {
        await this.writeToPackfile(entry.oid);
      }
    }
  }

  async downloadPush(tag) {
    let headSha = await this.contract.head(this.repoName, tag);

    await this.downloadAllPackfiles(headSha);

    await this.gitCommand('writeRef', { ref: 'refs/heads/master', value: headSha, force: true });
    await this.gitCommand('checkout', { ref: 'master' });
  }

  async downloadAllPackfiles(sha) {
    await this.loadBlobStoreConfig();

    while (sha && sha.length) {

      let packSha = await this.contract.pack(this.repoName, sha);

      let packFile = await readFromBlobStream(packSha, this.blobStorageConfig);

      if (this.encryptionKey) {
        packFile = Buffer.from(JSON.parse(decrypt(packFile.toString(), this.encryptionKey)));
      }

      let path = join(this.gitDir, "objects/pack", packSha);

      writeFileSync(path, packFile);

      await this.gitCommand('indexPack', { filepath: join('.git/objects/pack', packSha) });

      sha = await this.contract.previousPushHeadSha(this.repoName, sha);
    }

  }

  async gitCommand(cmd, opts={}) {
    if(!opts.dir) {
      opts.dir = this.repoPath;
    }

    if (!opts.gitdir) {
      opts.gitdir = this.gitDir;
    }

    return await Git[cmd].call(Git, opts);
  }

  async writePushToBlockchain(commit, tag, packSha) {
    await this.contract.push(this.repoName, tag, commit.oid, packSha, {from: this.from});
  }

  async handlePrivate() {
    this.isPrivate = await this.contract.isPrivate(this.repoName);

    if(this.isPrivate) {
      if (!this.privateKeyDir) {
        throw new Error("Private key is required for this repo operation");
      }
      if(!this.from) {
        throw new Error("From argument is required for this repo operation");
      }
      this.encryptionKey = await Githereum.getDecryptedKey(this.privateKeyDir, this.repoName, this.from, this.contract);
    }
  }

  async push(tag) {

    if(!tag || !tag.length) {
      throw new Error("Tag must be provided to push to");
    }
    await this.ensureRegistered();
    await this.handlePrivate();

    let head;

    try {
      head = await Githereum.head(this.repoName, tag, this.contract, { log: this.log });
    } catch(e) {
      // There is no head for this tag
    }

    let commits = await this.getCommits(head);

    if (commits.length === 0) {
      this.log(`Nothing to push, tag ${tag} is already at sha ${head}`);
      return;
    }

    let { filename, packfile } = await this.makePackFile(async () => {
      for (let commit of commits) {
        await this.writeToPackfile(commit.oid);
        await this.storeTree(commit.tree);
      }
    });

    await this.writeToBlobStream(filename, packfile);

    let pushPayload = await this.writePushToBlockchain(commits[commits.length-1], tag, filename);

    return pushPayload;
  }

  async clone(tag) {

    if(!tag || !tag.length) {
      throw new Error("Tag must be provided to clone from");
    }
    await this.ensureRegistered();
    await this.handlePrivate();

    if (existsSync(this.repoPath)) {
      throw new Error(`Path ${this.repoPath} already exists!`);
    }

    this.repo = await this.gitCommand('init');

    await this.downloadPush(tag);
  }

  async pull(tag) {
    if(!tag || !tag.length) {
      throw new Error("Tag must be provided to pull from");
    }
    await this.ensureRegistered();
    await this.handlePrivate();

    if (!existsSync(this.repoPath)) {
      throw new Error(`Path ${this.repoPath} doesn't exist!`);
    }

    await this.downloadPush(tag);

  }

  async getCommits(since) {
    let orderedCommits = (await this.gitCommand('log', { ref: 'HEAD' })).reverse();

    if (since) {
      let index = orderedCommits.findIndex(c => c.oid === since);
      orderedCommits = orderedCommits.slice(index + 1);
    }

    return orderedCommits;
  }

  async makePackFile(callback) {

    this.oidsToPack = [];

    await callback();


    return await this.gitCommand('packObjects', {
      oids: this.oidsToPack
    });
  }

  async writeToPackfile(oid) {
    this.oidsToPack.push(oid);
  }

  async writeToBlobStream(key, blob) {
    await this.loadBlobStoreConfig();

    if (this.encryptionKey) {
      blob = encrypt(JSON.stringify(blob), this.encryptionKey);
    }

    await writeToBlobStream(key, blob, this.blobStorageConfig);
  }

  async readObject(sha) {
    let { object } = await this.gitCommand('readObject', { oid: sha, format: 'content'});
    return object;
  }

}

module.exports = Githereum;
