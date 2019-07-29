const defaultLogger   = require('debug')('gitchain');
const fs              = require('fs');
const Git             = require('isomorphic-git');
Git.plugins.set('fs', fs);

const { writeToBlobStream, readFromBlobStream, blobStoreMeta }   = require('./utils/blob-storage');
const { writeFileSync, existsSync }        = require('fs');
const { join }             = require('path');

const GithereumContract = artifacts.require('Githereum');


class Githereum {
  constructor(repoPath, contractAddress, from, { log, blobStorage }={}) {
    if (!repoPath) {
      throw new Error("repoPath is a required argument");
    }
    if (!contractAddress) {
      throw new Error("contractAddress is a required argument");
    }

    this.repoPath   = repoPath;
    this.gitDir     = join(this.repoPath, '.git');
    if(existsSync(repoPath) && !existsSync(this.gitDir)) {
      // treat it as a bare repo because it exists buts it doesn't have a .git dir in it
      this.gitDir = this.repoPath;
    }

    this.contractAddress = contractAddress;
    this.from = from;

    this.log        = log || defaultLogger;

    this.blobStorageConfig = blobStorage || {
      type: 'tmpfile',
      path: 'tmp/blobs'
    };
  }

  static async head(tag, contractAddress, { log } = {}) {
    log = log || defaultLogger;

    log(`Checking status of tag ${tag}`);

    let contract = await GithereumContract.at(contractAddress);
    let push = await contract.pushes(tag);
    let { headSha } = push;

    log(`Sha of ${tag} is ${headSha}`);

    return headSha;
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
    let contract = await this.contract();

    let push = await contract.pushes(tag);
    let { headSha } = push;

    await this.downloadAllPackfiles(headSha);

    await this.gitCommand('writeRef', { ref: 'refs/heads/master', value: headSha, force: true });
    await this.gitCommand('checkout', { ref: 'master' });
  }

  async downloadAllPackfiles(sha) {
    let contract = await this.contract();

    while (sha) {

      let push = await contract.headShas(sha);

      let { packSha } = push ;

      let packFile = await readFromBlobStream(packSha, this.blobStorageConfig);

      let path = join(this.gitDir, "objects/pack", packSha);

      writeFileSync(path, packFile);

      await this.gitCommand('indexPack', { filepath: join('.git/objects/pack', packSha) });

      sha = push.previousPushHeadSha;
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
    let meta = JSON.stringify(blobStoreMeta(this.blobStorageConfig));
    await (await this.contract()).push(tag, commit.oid, packSha, meta, {from: this.from});
  }

  async contract() {
    if (this.githereumContract) {
      return this.githereumContract;
    }

    this.githereumContract = await GithereumContract.at(this.contractAddress);
    return this.githereumContract;
  }

  async push(tag) {
    let head;

    try {
      head = await Githereum.head(tag, this.contractAddress, { log: this.log });
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
        this.log(`Storing commit ${commit.oid}`);
        await this.writeToPackfile(commit.oid);
        await this.storeTree(commit.tree);
      }
    });

    await this.writeToBlobStream(filename, packfile);

    let pushPayload = await this.writePushToBlockchain(commits[commits.length-1], tag, filename);

    return pushPayload;
  }

  async clone(tag) {
    if (existsSync(this.repoPath)) {
      throw new Error(`Path ${this.repoPath} already exists!`);
    }

    this.repo = await this.gitCommand('init');


    await this.downloadPush(tag);
  }

  async pull(tag) {
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
    await writeToBlobStream(key, blob, this.blobStorageConfig);
  }


  async readObject(sha) {
    let { object } = await this.gitCommand('readObject', { oid: sha, format: 'content'});
    return object;
  }

}

module.exports = Githereum;