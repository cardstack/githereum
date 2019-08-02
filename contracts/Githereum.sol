pragma solidity 0.5.8;


contract Githereum {
  struct Repo {
    bool registered;

    mapping (address => bool) owners;
    mapping (address => bool) writers;
  }

  mapping(string => Repo) public repos;

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

    string memory previousPushHeadSha = p.headSha;

    p.tag = tag;
    p.headSha = headSha;
    p.packSha = packSha;
    p.blobStoreMeta = blobStoreMeta;
    p.previousPushHeadSha = previousPushHeadSha;

    headShas[headSha] = p;
  }

  function register(string memory name) public {
    Repo storage r = repos[name];

    require(!r.registered, "Repo already exists");
    r.registered = true;
    _addOwner(r, msg.sender);
  }

  function addOwner(string memory repoName, address newOwner) public {
    require(isOwner(repoName, msg.sender), "Only repo owners can add new owners");
    _addOwner(repos[repoName], newOwner);
  }

  function removeOwner(string memory repoName, address ownerToRemove) public {
    require(isOwner(repoName, msg.sender), "Only repo owners can remove owners");
    _removeOwner(repos[repoName], ownerToRemove);
  }

  function isOwner(string memory repoName, address account) public view returns (bool) {
    return hasOwner(repos[repoName], account);
  }

  function isWriter(string memory repoName, address account) public view returns (bool) {
    return hasWriter(repos[repoName], account);
  }

  function _addOwner(Repo storage repo, address account) internal {
    require(account != address(0), "Null address checked");
    require(!hasOwner(repo, account), "Address is already owner");

    repo.owners[account] = true;
  }

  function _removeOwner(Repo storage repo, address account) internal {
    require(account != address(0), "Null address checked");
    require(hasOwner(repo, account), "Address is not owner");

    repo.owners[account] = false;
  }

  function hasOwner(Repo storage repo, address account) internal view returns (bool) {
    require(account != address(0), "Null address checked");
    return repo.owners[account];
  }

  function _addWriter(Repo storage repo, address account) internal {
    require(account != address(0), "Null address checked");
    require(!hasWriter(repo, account), "Address is already writer");

    repo.writers[account] = true;
  }

  function _removeWriter(Repo storage repo, address account) internal {
    require(account != address(0), "Null address checked");
    require(hasWriter(repo, account), "Address is not writer");

    repo.writers[account] = false;
  }

  function hasWriter(Repo storage repo, address account) internal view returns (bool) {
    require(account != address(0), "Null address checked");
    return repo.writers[account];
  }

}
