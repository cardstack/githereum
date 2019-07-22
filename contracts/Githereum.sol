pragma solidity 0.5.8;


contract Githereum {

  struct Push {
    string tag;
    string sha;
  }

  mapping(string => Push) public pushes;

  function push(string memory tag, string memory sha) public {
    Push storage p = pushes[tag];
    p.tag = tag;
    p.sha = sha;
  }
}
