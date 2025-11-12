export const getCoverPath = (id: string) => {
  const subdirectory = id[0].toLowerCase();
  return `/covers/${subdirectory}/${id}.jpg`;
};
