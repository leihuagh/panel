import React from 'react';
import { observer, inject } from 'mobx-react';
import { Route, Switch } from "react-router-dom";
import Typography from 'material-ui/Typography';
import Button from 'material-ui/Button';
import Table, { TableBody, TableCell, TableHead, TableRow } from 'material-ui/Table';
import Grid from 'material-ui/Grid';
import Toolbar from 'material-ui/Toolbar';
import Paper from 'material-ui/Paper';
import Drawer from 'material-ui/Drawer';
import AppBar from 'material-ui/AppBar';
import { CircularProgress } from 'material-ui/Progress';
import Dialog, {
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from 'material-ui/Dialog';
import ExtensionStateCompleteIcon from 'material-ui-icons/CheckCircle';
import InputField from 'components/Form/input-field';
import { graphql } from 'react-apollo';
import gql from 'graphql-tag';
import validatorjs from 'validatorjs';
import MobxReactForm from 'mobx-react-form';
import styles from './style.module.css';
import DockerBuilder from './DockerBuilder';


@inject("store") @observer

@graphql(gql`
  query ProjectExtensions($slug: String, $environmentId: String){
    project(slug: $slug, environmentId: $environmentId) {
      id
      name
      slug
      extensions {
        id
        extensionSpec {
          id
          name
          type
        }
        state
        formSpecValues {
          key
          value
        }
        artifacts {
          key
          value
        }
        created
      }
    }
    extensionSpecs {
      id
      name
      component
      formSpec {
        key
        value
      }
      type
      key
      environmentVariables {
        id
        key
        value
      }
      created
    }
  }`, {
  options: (props) => ({
    variables: {
      slug: props.match.params.slug,
      environmentId: props.store.app.currentEnvironment.id,
    }
  })
})

@graphql(gql`
  mutation CreateExtension ($projectId: String!, $extensionSpecId: String!, $formSpecValues: [KeyValueInput!]!, $environmentId: String!) {
      createExtension(extension:{
        projectId: $projectId,
        extensionSpecId: $extensionSpecId,
        formSpecValues: $formSpecValues,
        environmentId: $environmentId,
      }) {
          id
      }
  }`, { name: "createExtension" }
)

@graphql(gql`
  mutation UpdateExtension ($id: String, $projectId: String!, $extensionSpecId: String!, $formSpecValues: [KeyValueInput!]!, $environmentId: String!) {
      updateExtension(extension:{
        id: $id,
        projectId: $projectId,
        extensionSpecId: $extensionSpecId,
        formSpecValues: $formSpecValues,
        environmentId: $environmentId,
      }) {
          id
      }
  }`, { name: "updateExtension" }
)

@graphql(gql`
  mutation DeleteExtension ($id: String, $projectId: String!, $extensionSpecId: String!, $formSpecValues: [KeyValueInput!]!, $environmentId: String!) {
      deleteExtension(extension:{
        id: $id,
        projectId: $projectId,
        extensionSpecId: $extensionSpecId,
        formSpecValues: $formSpecValues,
        environmentId: $environmentId,
      }) {
          id
      }
  }`, { name: "deleteExtension" }
)
export default class Extensions extends React.Component {
  constructor(props){
    super(props)
    this.state = {
      addedExtensionsDrawer: {
        open: false,
        currentExtension: null,
      },
      availableExtensionsDrawer: {
        open: false,
        currentExtensionSpec: null,
        btnDisabled: false,
      },
	    extensionFormSpecIsAutoGenerated: false,
      dialogOpen: false,
    }
  }

  isAddedExtensionSelected(id){
    if(this.state.addedExtensionsDrawer.currentExtension){
      return this.state.addedExtensionsDrawer.currentExtension.id === id;
    }
    return false
  }

  isAvailableExtensionSelected(id){
    if(this.state.availableExtensionsDrawer.currentExtension){
      return this.state.availableExtensionsDrawer.currentExtensionSpec.id === id;
    }
    return false
  }

  handleAddedExtensionClick(event, extension){
    let addedExtensionsDrawer = this.state.addedExtensionsDrawer
    addedExtensionsDrawer.currentExtension = extension
    addedExtensionsDrawer.open = true

    let availableExtensionsDrawer = this.state.availableExtensionsDrawer
    availableExtensionsDrawer.open = false

    this.setState({
      addedExtensionsDrawer: addedExtensionsDrawer,
      availableExtensionsDrawer: availableExtensionsDrawer,
      currentExtension: extension
    })
  }

  handleCloseAddedExtensionsDrawer(){
    let addedExtensionsDrawer = this.state.addedExtensionsDrawer
    addedExtensionsDrawer.open = false

    this.setState({
      addedExtensionsDrawer: addedExtensionsDrawer
    })
  }



  handleAvailableExtensionClick(event, extensionSpec){
      // check if added extension includes atleast one workflow if this is type deployment
    if(extensionSpec.type === "deployment"){
        let valid = false
        this.props.data.project.extensions.forEach(function(extension){
            if(extension.extensionSpec.type === "workflow"){
                valid = true
                return
            }
        })
        if(!valid){
            this.props.store.app.setSnackbar({ msg: "Must install a workflow extension before installing a deployment type" })
            return null
        }
    }

    let availableExtensionsDrawer = this.state.availableExtensionsDrawer
    availableExtensionsDrawer.currentExtensionSpec = extensionSpec
    availableExtensionsDrawer.open = true

    let addedExtensionsDrawer = this.state.addedExtensionsDrawer
    addedExtensionsDrawer.open = false

    let extensionFormSpecIsAutoGenerated = true


    if(extensionSpec.component === "DockerBuilderView"){
        extensionFormSpecIsAutoGenerated = false
    }

    this.setState({
        addedExtensionsDrawer: addedExtensionsDrawer,
        autoGeneratedForm: this.renderFormSpecFromExtensionSpec(extensionSpec),
        availableExtensionsDrawer: availableExtensionsDrawer,
        currentExtension: extensionSpec,
        extensionFormSpecIsAutoGenerated: extensionFormSpecIsAutoGenerated,
    })

  }

  handleCloseAvailableExtensionsDrawer(){
    let availableExtensionsDrawer = this.state.availableExtensionsDrawer
    availableExtensionsDrawer.open = false
    availableExtensionsDrawer.btnDisabled = false

    this.setState({
      availableExtensionsDrawer: availableExtensionsDrawer
    })
  }

  onSuccessAddExtension(form){
    var self = this
    let convertedFormSpecValues = []
    if(this.form !== null){
      convertedFormSpecValues = Object.keys(this.form.values()).map(function(key, index) {
        return {
            'key': key,
            'value': self.form.values()[key]
        }
      })
    }
    this.props.createExtension({
      variables: {
        'projectId': this.props.data.project.id,
        'extensionSpecId': this.state.availableExtensionsDrawer.currentExtensionSpec.id,
        'formSpecValues': convertedFormSpecValues,
        'environmentId': this.props.store.app.currentEnvironment.id,
      }
    }).then(({ data }) => {
      this.props.data.refetch()
      this.handleCloseAvailableExtensionsDrawer()
    })
  }

  onErrorAddExtension(form){
    // todo
  }

  handleAddExtension(extension, event){
    let availableExtensionsDrawer = this.state.availableExtensionsDrawer
    availableExtensionsDrawer.btnDisabled = true
    this.setState({ availableExtensionsDrawer: availableExtensionsDrawer })

    if(this.form){
      this.form.onSubmit(event, { onSuccess: this.onSuccessAddExtension.bind(this), onError: this.onErrorAddExtension.bind(this) })
    } else {
        this.props.createExtension({
          variables: {
            'projectId': this.props.data.project.id,
            'extensionSpecId': this.state.availableExtensionsDrawer.currentExtensionSpec.id,
            'formSpecValues': [],
            'environmentId': this.props.store.app.currentEnvironment.id,
          }
        }).then(({ data }) => {
          this.props.data.refetch()
          this.handleCloseAvailableExtensionsDrawer()
        });
    }
  }

  convertKVToJson(kvArr){
    let obj = {}
    kvArr.forEach(function(kv){
      obj[kv.key] = kv.value
    })
    return obj
  }

  renderFormSpecFromExtensionSpec(extensionSpec){
	  let form = (<div></div>)

    if(extensionSpec.id !== -1){
        switch(extensionSpec.component){
        case "DockerBuilderView":
            form = (<DockerBuilder
                        data={this.props.data}
                        project={this.props.data.project}
                        extensionSpec={extensionSpec}
                        store={this.props.store}
                        createExtension={this.props.createExtension}
                        handleClose={this.handleCloseAvailableExtensionsDrawer.bind(this)}
                        viewType="edit" />)
            break;
        default:
            if(extensionSpec.formSpec.length > 0 ){
                if(extensionSpec.id !== -1 ){

                  let plugins = {
                    dvr: validatorjs,
                  }

                  let fields= extensionSpec.formSpec.map(function(kv){
                    return kv.key
                  })

                  let rules = {}
                  extensionSpec.formSpec.map(function(kv){
                    rules[kv.key] = kv.value
                  })

                  let labels = {}
                  extensionSpec.formSpec.map(function(kv){
                    labels[kv.key] = kv.key
                  })


                  this.form = new MobxReactForm({ fields, rules, labels, plugins })
                  var self = this;
                  form = (
                    <div>
                      <form>
                        <Typography>
                          {fields.map(function(field){
                               return (
                                 <InputField field={self.form.$(field)} />
                               )
                            })}
                        </Typography>
                      </form>
                    </div>
                  )

                }
            } else {
                this.form = null
            }
        }
    } else {
        this.form = null
    }
	return form
  }

  renderFormSpecValues(extension){
		let formSpecValues = JSON.parse(extension.formSpecValues)
		formSpecValues = JSON.stringify(formSpecValues, null, 2)
		return (
			<Typography type="body2">
				{formSpecValues}
			</Typography>
		)
  }

  renderAddedExtensionView(extension){
    let view = (<div></div>);

    if(extension.id !== -1){
        switch(extension.extensionSpec.component){
            case "DockerBuilderView":
                view = (
                  <DockerBuilder
                      project={this.props.data.project}
                      extensionSpec={extension.extensionSpec}
                      extension={extension}
                      store={this.props.store}
                      updateExtension={this.props.updateExtension}
                      handleClose={this.handleCloseAddedExtensionsDrawer.bind(this)}
                      viewType="read" />)
                break;
            default:
              view = (
              <div>
                  <Grid item xs={12}>
                      <Paper>
                          <Toolbar>
                              <div>
                                  <Typography type="title">
                                      Artifacts
                                  </Typography>
                              </div>
                          </Toolbar>
                          <Table>
                              <TableHead>
                                  <TableRow>
                                          <TableCell>
                                              Key
                                          </TableCell>
                                          <TableCell>
                                              Value
                                          </TableCell>
                                  </TableRow>
                              </TableHead>
                              <TableBody>
                              {extension.artifacts.map(artifact => {
                                  return (
                                      <TableRow
                                        key={artifact.key}
                                      >
                                          <TableCell>
                                            {artifact.key}
                                          </TableCell>
                                          <TableCell>
                                            {artifact.value}
                                          </TableCell>
                                      </TableRow>
                                  )
                              })}
                              </TableBody>
                          </Table>
                      </Paper>
                  </Grid>
              </div>
              )
      }
    }
    return view
  }

  handleDeleteExtension(){
    let variables = {
        'id': this.state.addedExtensionsDrawer.currentExtension.id,
        'projectId': this.props.data.project.id,
        'extensionSpecId': this.state.addedExtensionsDrawer.currentExtension.id,
        'formSpecValues': this.state.addedExtensionsDrawer.currentExtension.formSpec,
        'environmentId': this.props.store.app.currentEnvironment.id,
    }
    this.props.deleteExtension({
        variables: {
            'id': this.state.addedExtensionsDrawer.currentExtension.id,
            'projectId': this.props.data.project.id,
            'extensionSpecId': this.state.addedExtensionsDrawer.currentExtension.extensionSpec.id,
            'formSpecValues': new Array(),
            'environmentId': this.props.store.app.currentEnvironment.id,
        }
    }).then(({ data }) => {
        this.props.data.refetch()
        this.handleCloseAddedExtensionsDrawer()
        this.setState({ dialogOpen: false })
    })
  }

  render() {
    const { loading, project, extensionSpecs } = this.props.data;

    if(loading){
      return (<div>Loading...</div>);
    }

    return (
      <div>
        <Grid container spacing={24}>
          <Grid item xs={12}>
            <Paper>
              <Toolbar>
                <div>
                  <Typography type="title">
                    Added Extensions
                  </Typography>
                </div>
              </Toolbar>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>
                      Name
                    </TableCell>
                    <TableCell>
                      Added
                    </TableCell>
                    <TableCell>
                      State
                    </TableCell>
                    <TableCell>
                      Type
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {project.extensions.map(extension => {
                    const isSelected = this.isAddedExtensionSelected(extension.id);
                    let stateIcon = <CircularProgress size={25} />
                    if(extension.state === "complete"){
                        stateIcon = <ExtensionStateCompleteIcon color={'green'} />
                    }

                    return (
                      <TableRow
                        hover
                        onClick={event => this.handleAddedExtensionClick(event, extension)}
                        selected={isSelected}
                        tabIndex={-1}
                        key={extension.id}>
                        <TableCell> { extension.extensionSpec.name } </TableCell>
                        <TableCell> { new Date(extension.created).toDateString() }</TableCell>
                        <TableCell> { stateIcon } </TableCell>
                        <TableCell> { extension.extensionSpec.type } </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </Paper>
          </Grid>
          <Grid item xs={12}>
            <Paper>
              <Toolbar>
                <div>
                  <Typography type="title">
                    Available Extensions
                  </Typography>
                </div>
              </Toolbar>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>
                      Name
                    </TableCell>
                    <TableCell>
                      Type
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {extensionSpecs.map(extensionSpec => {
                    let ignore = false

                    // check if this is already in added extensions
                    const addedExtensions = project.extensions.map(function(extension){
                      return extension.extensionSpec.name
                    })

                    if(addedExtensions.includes(extensionSpec.name)){
                      ignore = true
                    }

                    if(!ignore){
                      const isSelected = this.isAvailableExtensionSelected(extensionSpec.id);
                      return (
                        <TableRow
                          hover
                          onClick={event => this.handleAvailableExtensionClick(event, extensionSpec)}
                          selected={isSelected}
                          tabIndex={-1}
                          key={extensionSpec.id}>
                          <TableCell> { extensionSpec.name } </TableCell>
                          <TableCell> { extensionSpec.type } </TableCell>
                        </TableRow>
                      )
                    } else {
                      return (
                        <div></div>
                      )
                    }
                  })}
                </TableBody>
              </Table>
            </Paper>
          </Grid>
        </Grid>

        {this.state.addedExtensionsDrawer.currentExtension &&
          <Drawer
            type="persistent"
            anchor="right"
            classes={{
              paper: styles.drawer
            }}
            open={this.state.addedExtensionsDrawer.open}
          >
              <div className={styles.createServiceBar}>
                <AppBar position="static" color="default">
                  <Toolbar>
                    <Typography type="title" color="inherit">
                      Extension
                    </Typography>
                  </Toolbar>
                </AppBar>
                <div className={styles.drawerBody}>
                  <Grid container spacing={24}>
                    <Grid item xs={12}>
                      <Typography>
                        Type: { this.state.addedExtensionsDrawer.currentExtension.extensionSpec.type}
                      </Typography>
                    </Grid>
                    <Grid item xs={12}>
                      {this.renderAddedExtensionView(this.state.addedExtensionsDrawer.currentExtension)}
                    </Grid>
                    <Grid item xs={12}>
                      <Button
                          onClick={() => this.setState({ dialogOpen: true })}
                          color="accent">
                          delete
                      </Button>
                    </Grid>
                  </Grid>
                </div>
              </div>
          </Drawer>
        }
        {this.state.addedExtensionsDrawer.currentExtension &&
            <Dialog open={this.state.dialogOpen} onRequestClose={() => this.setState({ dialogOpen: false })}>
              <DialogTitle>{"Are you sure you want to delete " + this.state.addedExtensionsDrawer.currentExtension.extensionSpec.name + "?"}</DialogTitle>
              <DialogContent>
                <DialogContentText>
                  {"This will delete the extension and all its generated environment variables and cloud resources associated with" + project.name + "."}
                </DialogContentText>
              </DialogContent>
              <DialogActions>
                <Button onClick={()=> this.setState({ dialogOpen: false })} color="primary">
                  Cancel
                </Button>
                <Button onClick={this.handleDeleteExtension.bind(this)} color="accent">
                  Confirm
                </Button>
              </DialogActions>
            </Dialog>
        }

      {this.state.availableExtensionsDrawer.currentExtensionSpec &&
        <Drawer
            type="persistent"
            anchor="right"
            classes={{
              paper: styles.drawer
            }}
            open={this.state.availableExtensionsDrawer.open}
          >
              <div className={styles.createServiceBar}>
                <AppBar position="static" color="default">
                  <Toolbar>
                    <Typography type="title" color="inherit">
                      Extension
                    </Typography>
                  </Toolbar>
                </AppBar>
                <div className={styles.drawerBody}>
                  <Grid container spacing={24}>
                    <Grid item xs={12}>
                      <Typography type="subheading">
                        { this.state.availableExtensionsDrawer.currentExtensionSpec.name }
                      </Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography type="body2">
                        Type: { this.state.availableExtensionsDrawer.currentExtensionSpec.type }
                      </Typography>
                    </Grid>
                    <Grid item xs={12}>
                      {this.state.autoGeneratedForm}
                    </Grid>
  				  {this.state.extensionFormSpecIsAutoGenerated &&
                    <Grid item xs={12}>
                      <Button raised color="primary" className={styles.rightPad}
                        onClick={(event) => this.handleAddExtension(this.state.availableExtensionsDrawer.currentExtensionSpec, event)}
                        disabled={this.state.availableExtensionsDrawer.btnDisabled}
                      >
                        Save
                      </Button>
                      <Button color="primary"
                        onClick={this.handleCloseAvailableExtensionsDrawer.bind(this)}
                      >
                        cancel
                      </Button>
                    </Grid>
  				  }
                  </Grid>
                </div>
              </div>
          </Drawer>
        }
      </div>
    )
  }
}
