const { TestHelper } = require('zos');
const { Contracts, ZWeb3 } = require('zos-lib');
const { expect } = require('chai');


ZWeb3.initialize(web3.currentProvider);

const Githereum = Contracts.getFromLocal('Githereum');

require('chai').should();

contract('Githereum', function (addresses) {

  const [ owner ] = addresses;

  let githereum;


  beforeEach(async function () {
    this.project = await TestHelper();
    githereum = await this.project.createProxy(Githereum);

  });


  describe('updating a tag', function() {

    it('allows pushing to a tag for the first time', async function() {
      let push = await githereum.methods.pushes('my-tag').call();
      expect(push.sha).to.not.be.ok;

      await githereum.methods.push('my-tag', 'abc123').send({from: owner});

      push = await githereum.methods.pushes('my-tag').call();
      expect(push.sha).to.equal('abc123');
    });

  });
});
