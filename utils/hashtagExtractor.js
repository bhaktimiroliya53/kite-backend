const extractHashtags = (text) => {
  const hashtags = text.match(/#\w+/g);

  return hashtags || [];
};

module.exports = extractHashtags;