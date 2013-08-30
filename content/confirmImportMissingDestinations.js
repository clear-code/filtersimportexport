var canAccept = true;

window.addEventListener("DOMContentLoaded", function() {
    var missingDestinationAction = window.arguments[0];
    var dangerousFilters = window.arguments[1];

    var messageField = document.getElementById("message");
    var filtersField = document.getElementById("filters");
    filtersField.value = dangerousFilters;
    filtersField.setAttribute("rows", Math.min(dangerousFilters.split("\n").length, 15));

    switch (missingDestinationAction) {
      case 1: // Import as they are
        messageField.textContent = filtersimportexport.getString("missingDestinationAccept");
        document.documentElement.buttons = "accept";
        break;
      case 2: // Don't import
        messageField.textContent = filtersimportexport.getString("missingDestinationCancel");
        document.documentElement.buttons = "accept";
        canAccept = false;
        break;
      default: // Otherwise, show confirmation
        messageField.textContent = filtersimportexport.getString("missingDestinationConfirm");
        break;
    }
}, false);

function onAccept() {
  if (canAccept)
      window.arguments[2]();
  window.close();
}
