const { expect } = require('chai');
const { shellCommand }            = require("../utils/async");
const fs                          = require('fs');
const glob                        = require('fast-glob');
const Git                         = require('isomorphic-git');

const Githereum                    = require('../githereum');
const { cli, setupFixtureRepo, setupBareFixtureRepo }   = require('./helper');


const { TestHelper } = require('zos');
const { Contracts, ZWeb3 } = require('zos-lib');

ZWeb3.initialize(web3.currentProvider);

const GithereumContract = Contracts.getFromLocal('Githereum');



contract.only("Githereum", (addresses) => {
  const [ owner ] = addresses;

  let githereumContract;

  beforeEach(async () => {
    await shellCommand("rm -rf tmp");
    await shellCommand("mkdir tmp");

    this.project = await TestHelper();
    githereumContract = await this.project.createProxy(GithereumContract);

  });

  it("pushes a simple repo to the blockchain and restores it again", async() => {
    await setupFixtureRepo('dummygit');


    let githereum = new Githereum('tmp/dummygit', githereumContract.address, owner, 'development', {log: console.log.bind(console)});
    await githereum.push('my-tag');
    // nocommit
    // await cli(`push tmp/dummygit my-tag`);

    // the objects should be stored in the object store
    let blobs = await glob('tmp/blobs/*');
    expect(blobs.length).to.equal(1);

    // nocommit
    // await cli(`clone my-tag tmp/cloned`);
    githereum = new Githereum('tmp/clone', githereumContract.address, owner, 'development' , {log: console.log.bind(console)});
    await githereum.clone('my-tag');


    let fullRef = await Git.resolveRef({ dir: 'tmp/cloned', ref: 'master' });
    expect(fullRef).to.equal('a47c8dc067a1648896f7de6759d25411f8f665a0');

    let commits = await Git.log({ dir: 'tmp/cloned' });

    expect(commits.length).to.equal(4);

    expect(commits.map(c => c.oid)).to.deep.equal(["a47c8dc067a1648896f7de6759d25411f8f665a0", "247e877ae8a62139e3561fd95ac3cfa48cbfab97", "23e65d5097a41c4f6f9b2937f807c78296ea3298", "b5d928ed34f07b13cb2c664903b771b12ad2ca29"]);

    expect(fs.readFileSync('tmp/cloned/README', 'utf8')).to.equal("Hello World\n");
  });


  // it("pushes a repo to the blockchain and restores it again when the repo uses packfiles", async() => {
  //   await cli("keygen -k tmp/some-key");
  //   await setupFixtureRepo('dummygit-packed');
  //   let result = await cli(`push -k tmp/some-key tmp/dummygit-packed ${t('packed-tag')}`);

  //   // should return the head commit
  //   expect(result.type).to.equal("PUSH");
  //   expect(result.id).to.equal(t("packed-tag"));

  //   // the objects should be stored in the object store
  //   let blobs = await glob('tmp/blobs/*');
  //   expect(blobs.length).to.equal(1);

  //   await cli(`clone ${t('packed-tag')} tmp/cloned`);

  //   let fullRef = await Git.resolveRef({ dir: 'tmp/cloned', ref: 'master' });
  //   expect(fullRef).to.equal('a47c8dc067a1648896f7de6759d25411f8f665a0');

  //   let commits = await Git.log({ dir: 'tmp/cloned' });

  //   expect(commits.length).to.equal(4);

  //   expect(commits.map(c => c.oid)).to.deep.equal(["a47c8dc067a1648896f7de6759d25411f8f665a0", "247e877ae8a62139e3561fd95ac3cfa48cbfab97", "23e65d5097a41c4f6f9b2937f807c78296ea3298", "b5d928ed34f07b13cb2c664903b771b12ad2ca29"]);

  //   expect(fs.readFileSync('tmp/cloned/README', 'utf8')).to.equal("Hello World\n");

  // }).timeout(20000).slow(4000);

  // it("pushes a repo to the blockchain and restores it again when the repo has commits with multiple parents", async() => {
  //   await cli("keygen -k tmp/some-key");
  //   await setupFixtureRepo('repo-with-merge');
  //   let result = await cli(`push -k tmp/some-key tmp/repo-with-merge ${t('merged-tag')}`);

  //   // should return the head commit
  //   expect(result.type).to.equal("PUSH");
  //   expect(result.id).to.equal(t('merged-tag'));

  //   // the objects should be stored in the object store
  //   let blobs = await glob('tmp/blobs/*');
  //   expect(blobs.length).to.equal(1);

  //   await cli(`clone ${t('merged-tag')} tmp/cloned`);

  //   let fullRef = await Git.resolveRef({ dir: 'tmp/cloned', ref: 'master' });
  //   expect(fullRef).to.equal('93ae4072e3660b23b30b80cfc98620dfbe20ca85');

  //   let commits = await Git.log({ dir: 'tmp/cloned' });

  //   expect(commits.length).to.equal(7);


  //   expect(commits.map(c => c.oid)).to.deep.equal(["93ae4072e3660b23b30b80cfc98620dfbe20ca85", "54663b63174fc953678bea90602f1cf44d86dc15", "ce28caec25546c289f53ee749851848104e5e47f", "a47c8dc067a1648896f7de6759d25411f8f665a0", "247e877ae8a62139e3561fd95ac3cfa48cbfab97", "23e65d5097a41c4f6f9b2937f807c78296ea3298", "b5d928ed34f07b13cb2c664903b771b12ad2ca29"]);

  //   expect(fs.readFileSync('tmp/cloned/README', 'utf8')).to.equal("Hello World - version C\n");

  // }).timeout(20000).slow(6000);


  // it("works with bare repos", async() => {
  //   await cli("keygen -k tmp/some-key");
  //   await setupBareFixtureRepo('dummygit');
  //   let result = await cli(`push -k tmp/some-key tmp/dummygit ${t('bare-tag')}`);

  //   // should return the head commit
  //   expect(result.type).to.equal("PUSH");
  //   expect(result.id).to.equal(t('bare-tag'));

  //   // the objects should be stored in the object store
  //   let blobs = await glob('tmp/blobs/*');
  //   expect(blobs.length).to.equal(1);

  //   await cli(`clone ${t('bare-tag')} tmp/cloned`);

  //   let fullRef = await Git.resolveRef({ dir: 'tmp/cloned', ref: 'master' });
  //   expect(fullRef).to.equal('a47c8dc067a1648896f7de6759d25411f8f665a0');

  //   let commits = await Git.log({ dir: 'tmp/cloned' });

  //   expect(commits.length).to.equal(4);

  //   expect(commits.map(c => c.oid)).to.deep.equal(["a47c8dc067a1648896f7de6759d25411f8f665a0", "247e877ae8a62139e3561fd95ac3cfa48cbfab97", "23e65d5097a41c4f6f9b2937f807c78296ea3298", "b5d928ed34f07b13cb2c664903b771b12ad2ca29"]);

  //   expect(fs.readFileSync('tmp/cloned/README', 'utf8')).to.equal("Hello World\n");

  // }).timeout(20000).slow(4000);

  // it("pushes an update to a tag to the blockchain", async() => {
  //   await cli("keygen -k tmp/some-key");
  //   await shellCommand("mkdir tmp/dummy-repo");

  //   await Git.init({ dir: 'tmp/dummy-repo' });

  //   let shas = [];


  //   async function writeDummyCommit(content) {
  //     fs.writeFileSync("tmp/dummy-repo/content.txt", content);
  //     await Git.add({ dir: 'tmp/dummy-repo', filepath: 'content.txt' });

  //     return await Git.commit({
  //       dir: 'tmp/dummy-repo',
  //       author: {
  //         name: 'Mr. Test',
  //         email: 'mrtest@example.com'
  //       },
  //       message: `Commit ${content}`
  //     });
  //   }

  //   for (let content of ["a", "b"]) {
  //     let sha = await writeDummyCommit(content);
  //     shas.push(sha);
  //   }

  //   let incrementalTag = t('incremental-tag');

  //   await cli(`push -k tmp/some-key tmp/dummy-repo ${incrementalTag}`);

  //   // the objects should be stored in the object store
  //   let blobs = await glob('tmp/blobs/*');
  //   expect(blobs.length).to.equal(1);


  //   let address = tagAddress(incrementalTag);
  //   let push = decodePayload((await request(Gitchain.restApiUrl(`state/${address}`), {json: true})).data);
  //   let headSha = push.data.attributes['head-sha'];
  //   let commit = decodePayload((await request(Gitchain.restApiUrl(`state/${commitAddress(headSha)}`), {json: true})).data);

  //   let firstPushSha = shas[shas.length - 1];
  //   expect(commit.id).to.equal(firstPushSha);

  //   expect(commit.data.relationships['previous-commit'].data).to.not.be.ok;
  //   expect(commit.data.attributes.tag).to.equal(incrementalTag);
  //   expect(commit.data.attributes['pack-sha']).to.equal(push.data.attributes['pack-sha']);


  //   let head = await cli(`head ${incrementalTag}`);

  //   expect(head).to.equal(firstPushSha);


  //   for (let content of ["c", "d"]) {
  //     let sha = await writeDummyCommit(content);
  //     shas.push(sha);
  //   }

  //   await cli(`push -k tmp/some-key tmp/dummy-repo ${incrementalTag}`);

  //   push = decodePayload((await request(Gitchain.restApiUrl(`state/${address}`), {json: true})).data);
  //   headSha = push.data.attributes['head-sha'];
  //   commit = decodePayload((await request(Gitchain.restApiUrl(`state/${commitAddress(headSha)}`), {json: true})).data);


  //   expect(commit.id).to.equal(shas[shas.length - 1]);
  //   let previousData = commit.data.relationships['previous-commit'].data;
  //   expect(previousData).to.be.ok;
  //   expect(previousData.type).to.equal("COMMIT");
  //   expect(previousData.id).to.equal(firstPushSha);

  //   expect(commit.data.attributes.tag).to.equal(incrementalTag);
  //   expect(commit.data.attributes['pack-sha']).to.equal(push.data.attributes['pack-sha']);



  //   head = await cli(`head ${incrementalTag}`);

  //   expect(head).to.equal(shas[shas.length - 1]);

  // }).timeout(20000).slow(4000);


  // it("pushes an update to a tag to the blockchain using stub storage", async() => {
  //   await cli("keygen -k tmp/some-key");
  //   await shellCommand("mkdir tmp/dummy-repo");

  //   await Git.init({ dir: 'tmp/dummy-repo' });

  //   let shas = [];


  //   async function writeDummyCommit(content) {
  //     fs.writeFileSync("tmp/dummy-repo/content.txt", content);
  //     await Git.add({ dir: 'tmp/dummy-repo', filepath: 'content.txt' });

  //     return await Git.commit({
  //       dir: 'tmp/dummy-repo',
  //       author: {
  //         name: 'Mr. Test',
  //         email: 'mrtest@example.com'
  //       },
  //       message: `Commit ${content}`
  //     });
  //   }

  //   for (let content of ["a", "b"]) {
  //     let sha = await writeDummyCommit(content);
  //     shas.push(sha);
  //   }

  //   let incrementalTag = `incremental-tag-${randomKey()}`;

  //   await cli(`push -s -k tmp/some-key tmp/dummy-repo ${incrementalTag}`);

  //   // the objects should be stored in the object store
  //   let blobs = await glob('tmp/blobs/*');
  //   expect(blobs.length).to.equal(0);

  //   let address = tagAddress(incrementalTag);
  //   let push = decodePayload((await request(Gitchain.restApiUrl(`state/${address}`), {json: true})).data);
  //   let headSha = push.data.attributes['head-sha'];
  //   let commit = decodePayload((await request(Gitchain.restApiUrl(`state/${commitAddress(headSha)}`), {json: true})).data);

  //   let firstPushSha = shas[shas.length - 1];
  //   expect(commit.id).to.equal(firstPushSha);

  //   expect(commit.data.relationships['previous-commit'].data).to.not.be.ok;
  //   expect(commit.data.attributes.tag).to.equal(incrementalTag);
  //   expect(commit.data.attributes['pack-sha']).to.equal(push.data.attributes['pack-sha']);


  //   let head = await cli(`head ${incrementalTag}`);

  //   expect(head).to.equal(firstPushSha);


  //   for (let content of ["c", "d"]) {
  //     let sha = await writeDummyCommit(content);
  //     shas.push(sha);
  //   }

  //   await cli(`push -s -k tmp/some-key tmp/dummy-repo ${incrementalTag}`);

  //   let secondBlobs = await glob('tmp/blobs/*');
  //   expect(secondBlobs.length).to.equal(0);

  //   push = decodePayload((await request(Gitchain.restApiUrl(`state/${address}`), {json: true})).data);
  //   headSha = push.data.attributes['head-sha'];
  //   commit = decodePayload((await request(Gitchain.restApiUrl(`state/${commitAddress(headSha)}`), {json: true})).data);


  //   expect(commit.id).to.equal(shas[shas.length - 1]);
  //   let previousData = commit.data.relationships['previous-commit'].data;
  //   expect(previousData).to.be.ok;
  //   expect(previousData.type).to.equal("COMMIT");
  //   expect(previousData.id).to.equal(firstPushSha);

  //   expect(commit.data.attributes.tag).to.equal(incrementalTag);
  //   expect(commit.data.attributes['pack-sha']).to.equal(push.data.attributes['pack-sha']);



  //   head = await cli(`head ${incrementalTag}`);

  //   expect(head).to.equal(shas[shas.length - 1]);

  // }).timeout(20000).slow(4000);



  // it("Pulls an updated tag from the blockchain", async() => {
  //   await cli("keygen -k tmp/some-key");
  //   await shellCommand("mkdir tmp/dummy-repo");

  //   await Git.init({ dir: 'tmp/dummy-repo' });

  //   let shas = [];


  //   async function writeDummyCommit(content) {
  //     fs.writeFileSync("tmp/dummy-repo/content.txt", content);
  //     await Git.add({ dir: 'tmp/dummy-repo', filepath: 'content.txt' });

  //     return await Git.commit({
  //       dir: 'tmp/dummy-repo',
  //       author: {
  //         name: 'Mr. Test',
  //         email: 'mrtest@example.com'
  //       },
  //       message: `Commit ${content}`
  //     });
  //   }

  //   for (let content of ["a", "b"]) {
  //     let sha = await writeDummyCommit(content);
  //     shas.push(sha);
  //   }

  //   await cli(`push -k tmp/some-key tmp/dummy-repo ${t('pull-tag')}`);

  //   let head = await cli(`head ${t('pull-tag')}`);

  //   expect(head).to.equal(shas[shas.length - 1]);

  //   await cli(`clone ${t('pull-tag')} tmp/cloned`);

  //   let fullRef = await Git.resolveRef({ dir: 'tmp/cloned', ref: 'master' });
  //   expect(fullRef).to.equal(head);

  //   let commits = await Git.log({ dir: 'tmp/cloned' });

  //   expect(commits.length).to.equal(2);

  //   expect(commits.map(c => c.oid)).to.deep.equal(shas.slice().reverse());

  //   expect(fs.readFileSync('tmp/cloned/content.txt', 'utf8')).to.equal("b");


  //   for (let content of ["c", "d"]) {
  //     let sha = await writeDummyCommit(content);
  //     shas.push(sha);
  //   }

  //   await cli(`push -k tmp/some-key tmp/dummy-repo ${t('pull-tag')}`);

  //   head = await cli(`head ${t('pull-tag')}`);

  //   expect(head).to.equal(shas[shas.length - 1]);

  //   await cli(`pull ${t('pull-tag')} tmp/cloned`);

  //   fullRef = await Git.resolveRef({ dir: 'tmp/cloned', ref: 'master' });
  //   expect(fullRef).to.equal(head);

  //   commits = await Git.log({ dir: 'tmp/cloned' });

  //   expect(commits.length).to.equal(4);

  //   expect(commits.map(c => c.oid)).to.deep.equal(shas.slice().reverse());

  //   expect(fs.readFileSync('tmp/cloned/content.txt', 'utf8')).to.equal("d");


  // }).timeout(20000).slow(4000);
});
