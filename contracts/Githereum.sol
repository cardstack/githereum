pragma solidity 0.5.8;


contract Githereum {

  struct Push {
    string tag;
    string headSha;
    string packSha;
    string blobStoreMeta;

    string previousPushHeadSha;
  }

  mapping(string => Push) public pushes;
  mapping(string => Push) public headShas;

  function push(string memory tag, string memory headSha, string memory packSha, string memory blobStoreMeta) public {
    Push storage p = pushes[tag];
    p.tag = tag;
    p.headSha = headSha;
    p.packSha = packSha;
    p.blobStoreMeta = blobStoreMeta;

    headShas[headSha] = p;
  }
}
