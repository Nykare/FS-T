export const formatDate = (dateString) => {
  /*const date = new Date(dateString);
  return date.toLocaleString();*/
  if(!dateString) return "Invalid date";
    try{
      const options = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      };
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('en-US', options).format(date);
    }catch{
      return "Invalid date";
    }
};

export default formatDate;