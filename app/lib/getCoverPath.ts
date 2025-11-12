export const getCoverPath = (id: number) => {
  const subdirectory = id.toString()[0].toLowerCase();
  return `/covers/${subdirectory}/${id}.jpg`;
};
