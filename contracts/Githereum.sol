pragma solidity 0.5.8;


contract Githereum {
  struct Repo {
    bool registered;
    int ownerCount;

    mapping (address => bool) owners;
    mapping (address => bool) writers;

    mapping(string => Push) pushes;
    mapping(string => Push) headShas;
  }

  mapping(string => Repo) public repos;

  struct Push {
    string tag;
    string headSha;
    string packSha;
    string blobStoreMeta;

    string previousPushHeadSha;
  }

  function push(
    string memory repoName,
    string memory tag,
    string memory headSha,
    string memory packSha,
    string memory blobStoreMeta) public {

    Repo storage repo = repos[repoName];

    require(repo.registered, "Cannot push to a repo that has not been registered");

    require(
      hasOwner(repo, msg.sender) || hasWriter(repo, msg.sender),
      "Cannot push to a repo that you are not a writer or owner of"
    );

    Push storage p = repo.pushes[tag];

    string memory previousPushHeadSha = p.headSha;

    p.tag = tag;
    p.headSha = headSha;
    p.packSha = packSha;
    p.blobStoreMeta = blobStoreMeta;
    p.previousPushHeadSha = previousPushHeadSha;

    repo.headShas[headSha] = p;
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

  function addWriter(string memory repoName, address newWriter) public {
    require(isOwner(repoName, msg.sender), "Only repo owners can add new writers");
    _addWriter(repos[repoName], newWriter);
  }

  function removeWriter(string memory repoName, address writerToRemove) public {
    require(isOwner(repoName, msg.sender), "Only repo owners can remove writers");
    _removeWriter(repos[repoName], writerToRemove);
  }

  function head(string memory repoName, string memory tag) public view returns (string memory) {
    Repo storage r = repos[repoName];
    require(r.registered, "Repo is not registered");
    Push storage p = r.pushes[tag];
    return p.headSha;
  }

  function pack(string memory repoName, string memory headSha) public view returns (string memory) {
    Repo storage r = repos[repoName];
    require(r.registered, "Repo is not registered");
    Push storage p = r.headShas[headSha];
    return p.packSha;
  }

  function previousPushHeadSha(string memory repoName, string memory headSha) public view returns (string memory) {
    Repo storage r = repos[repoName];
    require(r.registered, "Repo is not registered");
    Push storage p = r.headShas[headSha];
    return p.previousPushHeadSha;
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
    repo.ownerCount += 1;
  }

  function _removeOwner(Repo storage repo, address account) internal {
    require(account != address(0), "Null address checked");
    require(hasOwner(repo, account), "Address is not owner");
    require(repo.ownerCount > 1, "Cannot remove the last owner from a repo");

    repo.owners[account] = false;
    repo.ownerCount -= 1;
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
